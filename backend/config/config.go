package config

import (
	"os"
)

// Config holds application configuration
type Config struct {
	Port          string
	AdminPassword string
	DBPath        string
	AutoSaveInterval int // in seconds
}

// Load returns the application configuration from environment variables
func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	adminPassword := os.Getenv("ADMIN_PASSWORD")
	if adminPassword == "" {
		adminPassword = "admin123" // Default password for development
	}

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/sheltie.db"
	}

	return &Config{
		Port:             port,
		AdminPassword:    adminPassword,
		DBPath:           dbPath,
		AutoSaveInterval: 60, // 1 minute
	}
}
