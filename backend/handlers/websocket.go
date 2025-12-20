package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/kywk/sheltie/backend/database"
	ws "github.com/kywk/sheltie/backend/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// Hub reference
var wsHub *ws.Hub

// SetHub sets the WebSocket hub reference
func SetHub(hub *ws.Hub) {
	wsHub = hub
}

// HandleWebSocket handles WebSocket connections at /ws/:id
func HandleWebSocket(c *gin.Context) {
	workspaceID := c.Param("id")
	userId := c.Query("userId")
	username := c.Query("username")

	if userId == "" {
		userId = "user_" + c.ClientIP()
	}
	if username == "" {
		username = "Anonymous"
	}

	// Verify workspace exists
	workspace, err := database.GetWorkspace(workspaceID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
		return
	}

	// Upgrade connection
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	// Create client with userId
	client := ws.NewClient(conn, wsHub, workspaceID, userId, username)

	// Register client
	wsHub.Register <- client

	// Send current content to new client
	initialMsg := &ws.Message{
		Type:        ws.MessageTypeContent,
		Content:     workspace.Content,
		WorkspaceID: workspaceID,
	}

	go func() {
		data, _ := json.Marshal(initialMsg)
		client.Send <- data
	}()

	// Start pumps
	go client.WritePump()
	client.ReadPump()
}
