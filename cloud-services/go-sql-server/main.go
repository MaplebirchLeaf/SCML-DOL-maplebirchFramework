package main

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	// 只导入 modernc.org/sqlite 的初始化逻辑，用于向 database/sql 注册 sqlite 驱动。
	// 代码中不直接调用该包，所以前面使用空白标识符 _。
	_ "modernc.org/sqlite"
)

const (
	// passwordIterations 是 PBKDF2 的迭代次数。次数越高，暴力破解成本越高，但登录/注册也会更慢。
	passwordIterations = 210000

	// passwordKeyBytes 是密码哈希最终输出的字节数。32 字节即 256 bit。
	passwordKeyBytes = 32
)

// usernamePattern 限制用户名格式：3-40 位，只允许小写字母、数字、下划线和短横线。
var usernamePattern = regexp.MustCompile(`^[a-z0-9_-]{3,40}$`)

// server 保存整个云存档后端运行时需要的共享对象。
type server struct {
	// db 是 SQLite 数据库连接池。Go 的 database/sql 会在内部管理连接复用。
	db *sql.DB

	// sessionTTL 表示登录 token 的有效期。
	sessionTTL time.Duration
}

// authRequest 表示注册和登录接口接收的 JSON 请求体。
type authRequest struct {
	// Username 是玩家账号名，对应 JSON 字段 username。
	Username string `json:"username"`

	// Password 是玩家密码，对应 JSON 字段 password。服务端不会明文保存它。
	Password string `json:"password"`
}

// authResponse 表示注册或登录成功后返回给前端的数据。
type authResponse struct {
	// UserID 是数据库中的用户 ID。
	UserID int64 `json:"userId"`

	// Username 是规范化后的用户名。
	Username string `json:"username"`

	// Token 是本次登录签发的明文 token，前端后续请求需要放到 Authorization: Bearer 中。
	Token string `json:"token"`

	// ExpiresAt 是 token 过期时间，单位为 Unix 毫秒时间戳。
	ExpiresAt int64 `json:"expiresAt"`
}

// saveRequest 表示上传云存档时前端发送的 JSON 请求体。
type saveRequest struct {
	// Slot 是本地/云端存档槽位编号。
	Slot int `json:"slot"`

	// UpdatedAt 是前端记录的存档更新时间，单位为 Unix 毫秒时间戳。
	UpdatedAt int64 `json:"updatedAt"`

	// Payload 是客户端加密后的存档 JSON。服务端只保存，不解密。
	Payload json.RawMessage `json:"payload"`
}

// saveListItem 表示云端存档列表中的单个条目，只包含槽位和更新时间。
type saveListItem struct {
	// Slot 是存档槽位编号。
	Slot int `json:"slot"`

	// UpdatedAt 是云端记录的更新时间，单位为 Unix 毫秒时间戳。
	UpdatedAt int64 `json:"updatedAt"`
}

// saveItem 表示读取单个云存档时返回的完整数据。
type saveItem struct {
	// Slot 是存档槽位编号。
	Slot int `json:"slot"`

	// UpdatedAt 是云端记录的更新时间，单位为 Unix 毫秒时间戳。
	UpdatedAt int64 `json:"updatedAt"`

	// Payload 是客户端加密后的存档 JSON。
	Payload json.RawMessage `json:"payload"`
}

// userRecord 表示从 users 表读出的用户记录。
type userRecord struct {
	// ID 是数据库自增用户 ID。
	ID int64

	// Username 是用户名。
	Username string

	// PasswordSalt 是注册时生成的随机盐，用于密码哈希。
	PasswordSalt []byte

	// PasswordHash 是 PBKDF2-HMAC-SHA256 后的密码哈希。
	PasswordHash []byte
}

// main 是程序入口：读取配置、打开数据库、初始化表结构并启动 HTTP 服务。
func main() {
	cfg, err := loadConfig()
	if err != nil {
		log.Fatal(err)
	}

	// 打开 SQLite 数据库。sql.Open 只是创建数据库句柄，不一定立即建立真实连接。
	db, err := sql.Open("sqlite", cfg.DBPath)
	if err != nil {
		log.Fatal(err)
	}
	// main 函数退出前关闭数据库连接池。
	defer db.Close()

	// 创建服务实例，并设置 session 有效期。默认 30 天，可通过 CLOUD_SAVE_SESSION_DAYS 修改。
	app := &server{
		db:         db,
		sessionTTL: time.Duration(cfg.SessionDays) * 24 * time.Hour,
	}

	// 初始化数据库表结构。
	if err := app.initDB(context.Background()); err != nil {
		log.Fatal(err)
	}

	// 启动 HTTP 服务。所有请求先经过 CORS 中间件，再进入 route 分发。
	log.Printf("cloud save server listening on %s, sqlite=%s, session_days=%d", cfg.Addr, cfg.DBPath, cfg.SessionDays)
	if err := http.ListenAndServe(cfg.Addr, app.withCORS(http.HandlerFunc(app.route))); err != nil {
		log.Fatal(err)
	}
}

// initDB 初始化 SQLite 数据库表结构和索引。
func (s *server) initDB(ctx context.Context) error {
	// users 保存账号。密码不明文入库，只保存随机盐和 PBKDF2 后的哈希。
	// sessions 保存登录 token 的哈希。数据库泄露时，攻击者也不能直接拿 token 调接口。
	// saves 用 (user_id, slot) 作为主键：同一个账号的每个存档槽只有一份云端数据。
	schema := []string{
		`PRAGMA foreign_keys = ON`,
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL UNIQUE,
			password_salt BLOB NOT NULL,
			password_hash BLOB NOT NULL,
			created_at INTEGER NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS sessions (
			token_hash TEXT PRIMARY KEY,
			user_id INTEGER NOT NULL,
			expires_at INTEGER NOT NULL,
			created_at INTEGER NOT NULL,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)`,
		`CREATE TABLE IF NOT EXISTS saves (
			user_id INTEGER NOT NULL,
			slot INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			payload TEXT NOT NULL,
			PRIMARY KEY(user_id, slot),
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
	}

	// 逐条执行建表语句。任意一步失败就返回错误，阻止服务继续启动。
	for _, sqlText := range schema {
		if _, err := s.db.ExecContext(ctx, sqlText); err != nil {
			return err
		}
	}
	return nil
}

// route 是 HTTP 路由分发入口，根据请求方法和路径调用对应处理函数。
func (s *server) route(w http.ResponseWriter, r *http.Request) {
	// 浏览器跨域请求可能会先发送 OPTIONS 预检请求，这里直接返回 204。
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// 健康检查接口，用于确认服务是否正在运行。
	if r.Method == http.MethodGet && r.URL.Path == "/health" {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}

	// 注册账号接口。
	if r.Method == http.MethodPost && r.URL.Path == "/auth/register" {
		s.register(w, r)
		return
	}

	// 登录账号接口。
	if r.Method == http.MethodPost && r.URL.Path == "/auth/login" {
		s.login(w, r)
		return
	}

	// 注销账户接口：需要先通过 token 鉴权，再进入 deleteAccount。
	if r.Method == http.MethodDelete && r.URL.Path == "/auth/account" {
		s.requireUser(w, r, s.deleteAccount)
		return
	}

	// 云存档列表接口：GET /saves。
	if r.URL.Path == "/saves" {
		s.requireUser(w, r, s.listSaves)
		return
	}

	// 单槽位云存档接口：GET/PUT/DELETE /saves/{slot}。
	if strings.HasPrefix(r.URL.Path, "/saves/") {
		s.requireUser(w, r, s.saveBySlot)
		return
	}

	// 没有匹配到任何路由时返回 404。
	http.NotFound(w, r)
}

// register 处理账号注册：校验用户名和密码，写入 users 表，并自动签发登录 session。
func (s *server) register(w http.ResponseWriter, r *http.Request) {
	// 读取并校验注册请求体。
	req, ok := readAuthRequest(w, r)
	if !ok {
		return
	}

	// 为每个用户生成独立随机盐，再对密码做 PBKDF2 哈希。
	salt := randomBytes(16)
	hash := hashPassword(req.Password, salt)
	now := time.Now().UnixMilli()

	// 插入用户记录。username 字段有 UNIQUE 约束，重复注册会失败。
	result, err := s.db.ExecContext(r.Context(), `INSERT INTO users (username, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?)`, req.Username, salt, hash, now)
	if isUniqueError(err) {
		http.Error(w, "username already exists", http.StatusConflict)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 注册成功后直接签发 session，让前端不用再单独登录一次。
	userID, _ := result.LastInsertId()
	s.issueSession(w, r, userID, req.Username)
}

// login 处理账号登录：校验密码，成功后签发新的 session token。
func (s *server) login(w http.ResponseWriter, r *http.Request) {
	// 读取并校验登录请求体。
	req, ok := readAuthRequest(w, r)
	if !ok {
		return
	}

	// 根据用户名查询用户记录。为了避免泄露信息，查不到用户也返回通用错误。
	user, err := s.findUser(r.Context(), req.Username)
	if err != nil {
		http.Error(w, "invalid username or password", http.StatusUnauthorized)
		return
	}

	// 使用数据库中的盐重新计算密码哈希，再用 ConstantTimeCompare 防止时序攻击。
	hash := hashPassword(req.Password, user.PasswordSalt)
	if subtle.ConstantTimeCompare(hash, user.PasswordHash) != 1 {
		http.Error(w, "invalid username or password", http.StatusUnauthorized)
		return
	}

	// 登录成功后签发 session token。
	s.issueSession(w, r, user.ID, user.Username)
}

// deleteAccount 处理账户注销：校验当前密码后删除账号、会话和全部云存档。
func (s *server) deleteAccount(w http.ResponseWriter, r *http.Request, userID int64) {
	// 注销账户属于危险操作，因此除了 Bearer token 外，还要求再次输入密码。
	var req struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json body", http.StatusBadRequest)
		return
	}
	if len(req.Password) < 8 {
		http.Error(w, "password must be at least 8 chars", http.StatusBadRequest)
		return
	}

	// 重新读取当前用户记录，用于校验密码。
	user, err := s.findUserByID(r.Context(), userID)
	if errors.Is(err, sql.ErrNoRows) {
		http.Error(w, "user not found", http.StatusUnauthorized)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 使用恒定时间比较密码哈希，避免根据比较耗时猜测正确密码。
	hash := hashPassword(req.Password, user.PasswordSalt)
	if subtle.ConstantTimeCompare(hash, user.PasswordHash) != 1 {
		http.Error(w, "invalid password", http.StatusUnauthorized)
		return
	}

	// 开启事务，保证 saves、sessions、users 的删除要么全部成功，要么全部回滚。
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	// 如果中途提前 return，事务会回滚。Commit 成功后 Rollback 会变成无效操作，可安全忽略。
	defer tx.Rollback()

	// 删除该账号的全部云存档。
	if _, err := tx.ExecContext(r.Context(), `DELETE FROM saves WHERE user_id = ?`, userID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 删除该账号的全部登录会话，让所有 token 立即失效。
	if _, err := tx.ExecContext(r.Context(), `DELETE FROM sessions WHERE user_id = ?`, userID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 最后删除用户本身。
	result, err := tx.ExecContext(r.Context(), `DELETE FROM users WHERE id = ?`, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	deleted, _ := result.RowsAffected()
	if deleted == 0 {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	// 提交事务，真正落库。
	if err := tx.Commit(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 204 表示删除成功，但不返回 JSON 内容。前端 request() 已经支持 204。
	w.WriteHeader(http.StatusNoContent)
}

// issueSession 创建新的登录 token，把 token 哈希写入 sessions 表，并把明文 token 返回给前端。
func (s *server) issueSession(w http.ResponseWriter, r *http.Request, userID int64, username string) {
	// newToken 同时返回明文 token 和可入库的 token 哈希。
	token, tokenHash := newToken()
	expiresAt := time.Now().Add(s.sessionTTL).UnixMilli()
	now := time.Now().UnixMilli()

	// 数据库只保存 token 哈希，不保存明文 token。
	_, err := s.db.ExecContext(r.Context(), `INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`, tokenHash, userID, expiresAt, now)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 明文 token 只在这次响应里返回给前端，后续由前端保存并带在 Authorization 请求头中。
	writeJSON(w, http.StatusOK, authResponse{UserID: userID, Username: username, Token: token, ExpiresAt: expiresAt})
}

// listSaves 返回当前用户所有云端存档槽位的列表。
func (s *server) listSaves(w http.ResponseWriter, r *http.Request, userID int64) {
	// /saves 目前只允许 GET，其他方法返回 405。
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 查询当前用户的所有云存档，只返回 slot 和 updated_at，不返回 payload。
	rows, err := s.db.QueryContext(r.Context(), `SELECT slot, updated_at FROM saves WHERE user_id = ? ORDER BY slot`, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	// rows 必须关闭，否则可能导致数据库资源泄漏。
	defer rows.Close()

	// 将查询结果逐行扫描到列表中。
	items := []saveListItem{}
	for rows.Next() {
		var item saveListItem
		if err := rows.Scan(&item.Slot, &item.UpdatedAt); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		items = append(items, item)
	}

	// 返回 JSON 数组；没有云存档时返回空数组 []。
	writeJSON(w, http.StatusOK, items)
}

// saveBySlot 根据请求方法分发单个槽位的读取、上传和删除操作。
func (s *server) saveBySlot(w http.ResponseWriter, r *http.Request, userID int64) {
	// 从 URL 中解析槽位编号，例如 /saves/1 -> 1。
	slot, err := parseSlot(r.URL.Path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// 同一个路径根据 HTTP 方法执行不同操作。
	switch r.Method {
	case http.MethodGet:
		s.getSave(w, r, userID, slot)
	case http.MethodPut:
		s.putSave(w, r, userID, slot)
	case http.MethodDelete:
		s.deleteSave(w, r, userID, slot)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// getSave 返回当前用户某个槽位的完整云存档内容。
func (s *server) getSave(w http.ResponseWriter, r *http.Request, userID int64, slot int) {
	var updatedAt int64
	var payloadText string

	// 只允许读取当前 userID 下的指定 slot，避免用户读取到别人的存档。
	err := s.db.QueryRowContext(r.Context(), `SELECT updated_at, payload FROM saves WHERE user_id = ? AND slot = ?`, userID, slot).Scan(&updatedAt, &payloadText)
	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// payloadText 本身是 JSON 文本，所以转换为 json.RawMessage，避免被二次转义成字符串。
	writeJSON(w, http.StatusOK, saveItem{Slot: slot, UpdatedAt: updatedAt, Payload: json.RawMessage(payloadText)})
}

// putSave 上传或覆盖当前用户某个槽位的云存档。
func (s *server) putSave(w http.ResponseWriter, r *http.Request, userID int64, slot int) {
	// 读取上传请求体。
	var req saveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json body", http.StatusBadRequest)
		return
	}

	// 路径中的槽位和请求体中的槽位必须一致，避免前端误传。
	if req.Slot != slot {
		http.Error(w, "slot in path and body must match", http.StatusBadRequest)
		return
	}

	// 服务端不解密 payload，但会检查它是否像客户端加密后的云存档结构。
	if !looksLikeEncryptedPayload(req.Payload) {
		http.Error(w, "payload must be encrypted cloud save json", http.StatusBadRequest)
		return
	}

	// 如果前端没有传有效更新时间，则使用服务端当前时间。
	if req.UpdatedAt <= 0 {
		req.UpdatedAt = time.Now().UnixMilli()
	}

	// SQLite 的 ON CONFLICT 是“如果主键已存在就更新”，正好适合覆盖同一账号的同一存档槽。
	_, err := s.db.ExecContext(
		r.Context(),
		`INSERT INTO saves (user_id, slot, updated_at, payload) VALUES (?, ?, ?, ?)
		 ON CONFLICT(user_id, slot) DO UPDATE SET updated_at = excluded.updated_at, payload = excluded.payload`,
		userID,
		slot,
		req.UpdatedAt,
		string(req.Payload),
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 返回更新后的槽位信息。
	writeJSON(w, http.StatusOK, saveListItem{Slot: slot, UpdatedAt: req.UpdatedAt})
}

// deleteSave 删除当前用户某个槽位的云存档。
func (s *server) deleteSave(w http.ResponseWriter, r *http.Request, userID int64, slot int) {
	// 即使目标槽位不存在，DELETE 仍然返回 204，这样前端可以把它视为“已删除”。
	if _, err := s.db.ExecContext(r.Context(), `DELETE FROM saves WHERE user_id = ? AND slot = ?`, userID, slot); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// requireUser 是鉴权中间件：检查 Bearer token，查出 userID 后再调用业务处理函数。
func (s *server) requireUser(w http.ResponseWriter, r *http.Request, next func(http.ResponseWriter, *http.Request, int64)) {
	// 前端需要发送 Authorization: Bearer <token>。
	token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	if token == "" {
		http.Error(w, "missing bearer token", http.StatusUnauthorized)
		return
	}

	// 数据库中存的是 token 哈希，所以这里也先对请求 token 做哈希。
	tokenHash := hashToken(token)
	now := time.Now().UnixMilli()

	// 只接受未过期的 session。
	var userID int64
	err := s.db.QueryRowContext(r.Context(), `SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?`, tokenHash, now).Scan(&userID)
	if errors.Is(err, sql.ErrNoRows) {
		http.Error(w, "invalid or expired token", http.StatusUnauthorized)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 鉴权成功后，把 userID 传给后续业务函数。
	next(w, r, userID)
}

// findUser 根据用户名查询用户记录。
func (s *server) findUser(ctx context.Context, username string) (userRecord, error) {
	var user userRecord
	err := s.db.QueryRowContext(ctx, `SELECT id, username, password_salt, password_hash FROM users WHERE username = ?`, username).Scan(
		&user.ID,
		&user.Username,
		&user.PasswordSalt,
		&user.PasswordHash,
	)
	return user, err
}

// findUserByID 根据用户 ID 查询用户记录，主要用于注销账户前重新校验密码。
func (s *server) findUserByID(ctx context.Context, userID int64) (userRecord, error) {
	var user userRecord
	err := s.db.QueryRowContext(ctx, `SELECT id, username, password_salt, password_hash FROM users WHERE id = ?`, userID).Scan(
		&user.ID,
		&user.Username,
		&user.PasswordSalt,
		&user.PasswordHash,
	)
	return user, err
}

// readAuthRequest 读取并校验注册/登录请求体，返回规范化后的 authRequest。
func readAuthRequest(w http.ResponseWriter, r *http.Request) (authRequest, bool) {
	var req authRequest

	// 将请求体 JSON 解码到 authRequest 结构体。
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json body", http.StatusBadRequest)
		return req, false
	}

	// 用户名统一转为小写并去掉前后空格，避免同名账号因大小写不同变成两个账号。
	req.Username = strings.ToLower(strings.TrimSpace(req.Username))
	if !usernamePattern.MatchString(req.Username) {
		http.Error(w, "username must be 3-40 chars: a-z, 0-9, _ or -", http.StatusBadRequest)
		return req, false
	}

	// 最小密码长度限制。这里只做基础限制，密码强度策略可以后续再增强。
	if len(req.Password) < 8 {
		http.Error(w, "password must be at least 8 chars", http.StatusBadRequest)
		return req, false
	}
	return req, true
}

// parseSlot 从 /saves/{slot} 路径中解析槽位编号。
func parseSlot(path string) (int, error) {
	// 去掉固定前缀，只保留槽位字符串。
	raw := strings.TrimPrefix(path, "/saves/")

	// 槽位必须是非负整数。
	slot, err := strconv.Atoi(raw)
	if err != nil || slot < 0 {
		return 0, fmt.Errorf("invalid save slot")
	}
	return slot, nil
}

// looksLikeEncryptedPayload 粗略检查 payload 是否符合客户端加密云存档格式。
func looksLikeEncryptedPayload(raw json.RawMessage) bool {
	// 这里只检查必要字段，不验证加密内容是否真的能解密。
	var payload struct {
		Version int    `json:"version"`
		Salt    string `json:"salt"`
		IV      string `json:"iv"`
		Data    string `json:"data"`
	}
	return json.Unmarshal(raw, &payload) == nil && payload.Version == 1 && payload.Salt != "" && payload.IV != "" && payload.Data != ""
}

// hashPassword 使用 PBKDF2-HMAC-SHA256 对密码进行加盐哈希。
func hashPassword(password string, salt []byte) []byte {
	return pbkdf2SHA256([]byte(password), salt, passwordIterations, passwordKeyBytes)
}

// pbkdf2SHA256 是 PBKDF2-HMAC-SHA256 的简单实现，用于从密码和盐派生固定长度密钥。
func pbkdf2SHA256(password []byte, salt []byte, iterations int, keyLen int) []byte {
	hashLen := sha256.Size
	blocks := (keyLen + hashLen - 1) / hashLen
	key := make([]byte, 0, blocks*hashLen)

	// PBKDF2 会按 block 生成派生密钥，每个 block 经过多轮 HMAC 迭代。
	for block := 1; block <= blocks; block++ {
		// U1 = PRF(password, salt || blockIndex)。
		mac := hmac.New(sha256.New, password)
		mac.Write(salt)
		mac.Write([]byte{byte(block >> 24), byte(block >> 16), byte(block >> 8), byte(block)})
		u := mac.Sum(nil)
		t := append([]byte(nil), u...)

		// U2 到 Uc 继续迭代，并按 PBKDF2 规则 XOR 到 t 中。
		for i := 1; i < iterations; i++ {
			mac = hmac.New(sha256.New, password)
			mac.Write(u)
			u = mac.Sum(nil)
			for j := range t {
				t[j] ^= u[j]
			}
		}
		key = append(key, t...)
	}

	// 截取调用者需要的长度。
	return key[:keyLen]
}

// randomBytes 生成指定长度的密码学安全随机字节。
func randomBytes(size int) []byte {
	bytes := make([]byte, size)
	if _, err := rand.Read(bytes); err != nil {
		// 随机数生成失败通常是系统级严重问题，这里直接 panic。
		panic(err)
	}
	return bytes
}

// newToken 生成新的登录 token，并同时返回明文 token 和入库用的哈希值。
func newToken() (plain string, hashed string) {
	// RawURLEncoding 生成适合放入 HTTP 头部的 URL 安全字符串。
	plain = base64.RawURLEncoding.EncodeToString(randomBytes(32))
	return plain, hashToken(plain)
}

// hashToken 对 session token 做 SHA-256 哈希，用于避免数据库保存明文 token。
func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// isUniqueError 判断数据库错误是否是唯一约束冲突。
func isUniqueError(err error) bool {
	// 这里用字符串判断，简单但不够严格；对于当前 modernc sqlite 场景已够用。
	return err != nil && strings.Contains(strings.ToLower(err.Error()), "unique")
}

// writeJSON 设置 JSON 响应头、状态码，并把 value 编码成 JSON 返回给前端。
func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

// withCORS 给 HTTP 服务包一层 CORS 中间件，允许浏览器前端跨域访问该后端。
func (s *server) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 当前是开发友好配置，允许所有来源访问。正式公开部署时建议改成固定域名。
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Cloud-Save-User")
		next.ServeHTTP(w, r)
	})
}
