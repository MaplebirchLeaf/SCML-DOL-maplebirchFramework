package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"
)

const defaultConfigPath = "config.json"

// config 保存后端启动配置。字段名同时用于 JSON 配置文件。
type config struct {
	// Addr 是 HTTP 监听地址，例如 :8787 或 <IP>:<端口>。
	Addr string `json:"addr"`

	// DBPath 是 SQLite 数据库文件路径。
	DBPath string `json:"dbPath"`

	// SessionDays 是登录 token 有效天数。
	SessionDays int `json:"sessionDays"`
}

// defaultConfig 返回无需任何配置即可本地启动的默认值。
func defaultConfig() config {
	return config{
		Addr:        ":8787",
		DBPath:      "./cloud-save.db",
		SessionDays: 30,
	}
}

// loadConfig 读取配置。优先级：默认值 < JSON 配置文件。
func loadConfig() (config, error) {
	cfg := defaultConfig()
	configPath := defaultConfigPath

	flag.StringVar(&configPath, "config", configPath, "JSON config file path")
	flag.Parse()

	if strings.TrimSpace(configPath) != "" && fileExists(configPath) {
		if err := readConfigFile(configPath, &cfg); err != nil {
			return cfg, err
		}
	}

	return cfg, validateConfig(cfg)
}

// fileExists 判断配置文件是否存在。默认 config.json 不存在时使用内置配置。
func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// readConfigFile 从 JSON 文件读取配置，只覆盖文件中出现的字段。
func readConfigFile(path string, cfg *config) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read config file %s: %w", path, err)
	}
	data = bytes.TrimPrefix(data, []byte{0xEF, 0xBB, 0xBF})
	if err := json.Unmarshal(data, cfg); err != nil {
		return fmt.Errorf("parse config file %s: %w", path, err)
	}
	return nil
}

// validateConfig 在服务启动前尽早暴露配置错误。
func validateConfig(cfg config) error {
	if strings.TrimSpace(cfg.Addr) == "" {
		return fmt.Errorf("addr cannot be empty")
	}
	if strings.TrimSpace(cfg.DBPath) == "" {
		return fmt.Errorf("dbPath cannot be empty")
	}
	if cfg.SessionDays <= 0 {
		return fmt.Errorf("sessionDays must be greater than 0")
	}
	if cfg.SessionDays > 3650 {
		return fmt.Errorf("sessionDays is too large: %d", cfg.SessionDays)
	}
	return nil
}
