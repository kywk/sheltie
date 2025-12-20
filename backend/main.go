package main

import (
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/kywk/sheltie/backend/config"
	"github.com/kywk/sheltie/backend/database"
	"github.com/kywk/sheltie/backend/handlers"
	"github.com/kywk/sheltie/backend/websocket"
)

func main() {
	// Load configuration
	cfg := config.Load()
	handlers.SetConfig(cfg)

	// Initialize database
	if err := database.Init(cfg.DBPath); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Create WebSocket hub
	hub := websocket.NewHub()
	handlers.SetHub(hub)
	go hub.Run()

	// Setup Gin router
	r := gin.Default()

	// CORS configuration
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Serve static files (frontend)
	r.Static("/assets", "./static/assets")
	r.StaticFile("/", "./static/index.html")
	r.StaticFile("/favicon.ico", "./static/favicon.ico")

	// Fallback to index.html for SPA routing
	r.NoRoute(func(c *gin.Context) {
		c.File("./static/index.html")
	})

	// API routes
	api := r.Group("/api")
	{
		// Public workspace access
		api.GET("/workspaces/:id", handlers.GetWorkspace)
		api.PUT("/workspaces/:id", handlers.UpdateWorkspace)

		// Admin routes
		admin := api.Group("/admin")
		{
			admin.POST("/login", handlers.Login)
			admin.POST("/logout", handlers.Logout)

			// Protected admin routes
			protected := admin.Group("")
			protected.Use(handlers.AdminAuthMiddleware())
			{
				protected.GET("/workspaces", handlers.ListWorkspaces)
				protected.POST("/workspaces", handlers.CreateWorkspace)
				protected.PUT("/workspaces/:id", handlers.UpdateWorkspaceInfo)
				protected.DELETE("/workspaces/:id", handlers.DeleteWorkspace)
			}
		}
	}

	// WebSocket endpoint
	r.GET("/ws/:id", handlers.HandleWebSocket)

	// Start server
	addr := ":" + cfg.Port
	log.Printf("Sheltie server starting on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
