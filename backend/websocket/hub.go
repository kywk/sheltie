package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/kywk/sheltie/backend/database"
)

// Message types
const (
	MessageTypeContent = "content"
	MessageTypeJoin    = "join"
	MessageTypeLeave   = "leave"
	MessageTypeCursor  = "cursor"
	MessageTypeUsers   = "users"
)

// Message represents a WebSocket message
type Message struct {
	Type           string     `json:"type"`
	Content        string     `json:"content,omitempty"`
	WorkspaceID    string     `json:"workspaceId,omitempty"`
	UserID         string     `json:"userId,omitempty"`
	Username       string     `json:"username,omitempty"`
	Position       int        `json:"position,omitempty"`
	SelectionStart int        `json:"selectionStart,omitempty"`
	SelectionEnd   int        `json:"selectionEnd,omitempty"`
	Users          []UserInfo `json:"users,omitempty"`
}

// UserInfo represents basic user data for list
type UserInfo struct {
	UserID         string `json:"userId"`
	Username       string `json:"username"`
	CursorPosition *int   `json:"cursorPosition,omitempty"`
}

// Client represents a connected WebSocket client
type Client struct {
	ID             string
	Username       string
	WorkspaceID    string
	Conn           *websocket.Conn
	Hub            *Hub
	Send           chan []byte
	CursorPosition *int
}

// Hub maintains active clients and broadcasts messages
type Hub struct {
	// Registered clients by workspace ID
	Rooms map[string]map[*Client]bool

	// Inbound messages from clients
	Broadcast chan *Message

	// Register requests
	Register chan *Client

	// Unregister requests
	Unregister chan *Client

	// Mutex for room operations
	mu sync.RWMutex

	// Last content per workspace for auto-save
	lastContent      map[string]string
	lastContentTime  map[string]time.Time
	contentMu        sync.RWMutex
	AutoSaveInterval time.Duration
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	hub := &Hub{
		Rooms:            make(map[string]map[*Client]bool),
		Broadcast:        make(chan *Message, 256),
		Register:         make(chan *Client),
		Unregister:       make(chan *Client),
		lastContent:      make(map[string]string),
		lastContentTime:  make(map[string]time.Time),
		AutoSaveInterval: 60 * time.Second, // Default 60 seconds
	}
	return hub
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	// Auto-save ticker (uses configurable interval)
	autoSaveTicker := time.NewTicker(h.AutoSaveInterval)
	defer autoSaveTicker.Stop()

	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			if h.Rooms[client.WorkspaceID] == nil {
				h.Rooms[client.WorkspaceID] = make(map[*Client]bool)
			}
			h.Rooms[client.WorkspaceID][client] = true
			h.mu.Unlock()

			// Send current user list to the new client
			h.sendUserList(client)

			// Notify others about new user
			h.broadcastToRoom(client.WorkspaceID, &Message{
				Type:     MessageTypeJoin,
				UserID:   client.ID,
				Username: client.Username,
			}, client)

			log.Printf("Client %s (%s) joined workspace %s", client.ID, client.Username, client.WorkspaceID)

		case client := <-h.Unregister:
			h.mu.Lock()
			if room, ok := h.Rooms[client.WorkspaceID]; ok {
				if _, ok := room[client]; ok {
					delete(room, client)
					close(client.Send)
					if len(room) == 0 {
						delete(h.Rooms, client.WorkspaceID)
					}
				}
			}
			h.mu.Unlock()

			// Notify others about user leaving
			h.broadcastToRoom(client.WorkspaceID, &Message{
				Type:     MessageTypeLeave,
				UserID:   client.ID,
				Username: client.Username,
			}, nil)

			log.Printf("Client %s left workspace %s", client.ID, client.WorkspaceID)

		case message := <-h.Broadcast:
			switch message.Type {
			case MessageTypeContent:
				// Store content for auto-save
				h.contentMu.Lock()
				h.lastContent[message.WorkspaceID] = message.Content
				h.lastContentTime[message.WorkspaceID] = time.Now()
				h.contentMu.Unlock()

				// Broadcast to all clients in the room
				h.broadcastToRoom(message.WorkspaceID, message, nil)

			case MessageTypeCursor:
				// Update client's cursor position
				h.mu.RLock()
				if room, ok := h.Rooms[message.WorkspaceID]; ok {
					for client := range room {
						if client.ID == message.UserID {
							client.CursorPosition = &message.Position
							break
						}
					}
				}
				h.mu.RUnlock()

				// Broadcast cursor to other users
				h.broadcastToRoom(message.WorkspaceID, message, nil)

			default:
				h.broadcastToRoom(message.WorkspaceID, message, nil)
			}

		case <-autoSaveTicker.C:
			h.autoSave()
		}
	}
}

// sendUserList sends the current user list to a specific client
func (h *Hub) sendUserList(client *Client) {
	users := h.getUsersInRoom(client.WorkspaceID)

	message := &Message{
		Type:  MessageTypeUsers,
		Users: users,
	}

	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling user list: %v", err)
		return
	}

	select {
	case client.Send <- data:
	default:
		log.Printf("Failed to send user list to client %s", client.ID)
	}
}

// getUsersInRoom returns a list of users in a workspace
func (h *Hub) getUsersInRoom(workspaceID string) []UserInfo {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var users []UserInfo
	if room, ok := h.Rooms[workspaceID]; ok {
		for client := range room {
			users = append(users, UserInfo{
				UserID:         client.ID,
				Username:       client.Username,
				CursorPosition: client.CursorPosition,
			})
		}
	}
	return users
}

// broadcastToRoom sends a message to all clients in a room
func (h *Hub) broadcastToRoom(workspaceID string, message *Message, exclude *Client) {
	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	// Copy client list while holding lock to avoid race condition
	h.mu.RLock()
	room := h.Rooms[workspaceID]
	clients := make([]*Client, 0, len(room))
	for client := range room {
		clients = append(clients, client)
	}
	h.mu.RUnlock()

	for _, client := range clients {
		if client == exclude {
			continue
		}
		select {
		case client.Send <- data:
		default:
			h.mu.Lock()
			if _, ok := h.Rooms[workspaceID][client]; ok {
				delete(h.Rooms[workspaceID], client)
				close(client.Send)
			}
			h.mu.Unlock()
		}
	}
}

// autoSave saves pending content to database
func (h *Hub) autoSave() {
	h.contentMu.Lock()
	defer h.contentMu.Unlock()

	cutoff := time.Now().Add(-30 * time.Second)
	for wsID, content := range h.lastContent {
		if lastTime, ok := h.lastContentTime[wsID]; ok && lastTime.After(cutoff) {
			if err := database.UpdateWorkspaceContent(wsID, content); err != nil {
				log.Printf("Error auto-saving workspace %s: %v", wsID, err)
			} else {
				log.Printf("Auto-saved workspace %s", wsID)
			}
		}
	}
}

// GetClientCount returns the number of clients in a workspace
func (h *Hub) GetClientCount(workspaceID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if room, ok := h.Rooms[workspaceID]; ok {
		return len(room)
	}
	return 0
}
