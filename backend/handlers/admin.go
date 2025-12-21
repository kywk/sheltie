package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kywk/sheltie/backend/config"
)

const (
	// Token expiry duration
	tokenExpiry = 24 * time.Hour
)

var (
	// Active admin tokens (in production, use Redis or JWT)
	adminTokens = make(map[string]time.Time)
	cfg         *config.Config
)

// SetConfig sets the configuration for admin handlers
func SetConfig(c *config.Config) {
	cfg = c
}

// LoginRequest represents the login request body
type LoginRequest struct {
	Password string `json:"password" binding:"required"`
}

// Login handles POST /api/admin/login
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password is required"})
		return
	}

	if req.Password != cfg.AdminPassword {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid password"})
		return
	}

	// Generate a secure random token
	token, err := generateSecureToken(32)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	adminTokens[token] = time.Now().Add(tokenExpiry)

	c.JSON(http.StatusOK, gin.H{
		"token":     token,
		"expiresIn": int(tokenExpiry.Seconds()),
	})
}

// Logout handles POST /api/admin/logout
func Logout(c *gin.Context) {
	token := c.GetHeader("Authorization")
	if token != "" {
		delete(adminTokens, token)
	}
	c.JSON(http.StatusOK, gin.H{"message": "Logged out"})
}

// AdminAuthMiddleware checks for valid admin token
func AdminAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		expiry, exists := adminTokens[token]
		if !exists || time.Now().After(expiry) {
			delete(adminTokens, token)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// generateSecureToken creates a cryptographically secure random token
func generateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

