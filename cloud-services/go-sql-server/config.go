package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strconv"
	"strings"
)

const (
	// 以下环境变量用于配置后端。环境变量优先级高于配置文件。
	envConfig      = "CLOUD_SAVE_CONFIG"
	envAddr        = "CLOUD_SAVE_ADDR"
	envDBPath      = "CLOUD_SAVE_DB"
	envSessionDays = "CLOUD_SAVE_SESSION_DAYS"
)

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

// loadConfig 读取配置。优先级：默认值 < JSON 配置文件 < 环境变量。
func loadConfig() (config, error) {
	cfg := defaultConfig()
	configPath := strings.TrimSpace(os.Getenv(envConfig))

	flag.StringVar(&configPath, "config", configPath, "JSON config file path")
	flag.Parse()

	if configPath != "" {
		if err := readConfigFile(configPath, &cfg); err != nil {
			return cfg, err
		}
	}

	applyEnv(&cfg)
	return cfg, validateConfig(cfg)
}

// readConfigFile 从 JSON 文件读取配置，只覆盖文件中出现的字段。
func readConfigFile(path string, cfg *config) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read config file %s: %w", path, err)
	}
	if err := json.Unmarshal(data, cfg); err != nil {
		return fmt.Errorf("parse config file %s: %w", path, err)
	}
	return nil
}

// applyEnv 用环境变量覆盖配置文件，便于部署平台注入运行参数。
func applyEnv(cfg *config) {
	if value := strings.TrimSpace(os.Getenv(envAddr)); value != "" {
		cfg.Addr = value
	}
	if value := strings.TrimSpace(os.Getenv(envDBPath)); value != "" {
		cfg.DBPath = value
	}
	if value := strings.TrimSpace(os.Getenv(envSessionDays)); value != "" {
		if days, err := strconv.Atoi(value); err == nil {
			cfg.SessionDays = days
		}
	}
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
