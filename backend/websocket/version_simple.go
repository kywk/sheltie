package websocket

import (
	"crypto/md5"
	"fmt"
	"sync"
	"time"

	"github.com/kywk/sheltie/backend/database"
)

// VersionManager manages document versions with conflict detection
type VersionManager struct {
	documents map[string]*VersionedDoc
	mu        sync.RWMutex
}

// VersionedDoc tracks document state with version and hash
type VersionedDoc struct {
	WorkspaceID string
	Content     string
	Version     int64
	Hash        string
	LastUpdated time.Time
	mu          sync.RWMutex
}

// UpdateResult represents the result of an update operation
type UpdateResult struct {
	Success bool
	Version int64
	Hash    string
	Content string
}

// NewVersionManager creates a new version manager
func NewVersionManager() *VersionManager {
	return &VersionManager{
		documents: make(map[string]*VersionedDoc),
	}
}

// GetDocument gets or creates a versioned document
func (vm *VersionManager) GetDocument(workspaceID string) *VersionedDoc {
	vm.mu.Lock()
	defer vm.mu.Unlock()

	if doc, exists := vm.documents[workspaceID]; exists {
		return doc
	}

	// Load from database
	workspace, err := database.GetWorkspace(workspaceID)
	if err != nil {
		// Create new document if not found
		doc := &VersionedDoc{
			WorkspaceID: workspaceID,
			Content:     "",
			Version:     0,
			Hash:        generateHash(""),
			LastUpdated: time.Now(),
		}
		vm.documents[workspaceID] = doc
		return doc
	}

	doc := &VersionedDoc{
		WorkspaceID: workspaceID,
		Content:     workspace.Content,
		Version:     workspace.Version,
		Hash:        generateHash(workspace.Content),
		LastUpdated: workspace.UpdatedAt,
	}
	vm.documents[workspaceID] = doc
	return doc
}

// UpdateContent updates document content with conflict detection
func (doc *VersionedDoc) UpdateContent(newContent string, clientVersion int64, clientHash string) UpdateResult {
	doc.mu.Lock()
	defer doc.mu.Unlock()

	currentHash := generateHash(doc.Content)

	// Check for conflicts
	if clientVersion < doc.Version || (clientVersion == doc.Version && clientHash != currentHash) {
		// Conflict detected - return current state
		return UpdateResult{
			Success: false,
			Version: doc.Version,
			Hash:    currentHash,
			Content: doc.Content,
		}
	}

	// No conflict - update content
	doc.Content = newContent
	doc.Version++
	doc.Hash = generateHash(newContent)
	doc.LastUpdated = time.Now()

	// Save to database
	go func() {
		success, err := database.UpdateWorkspaceContentWithVersion(doc.WorkspaceID, newContent, doc.Version-1)
		if err != nil || !success {
			// If database update fails, revert version
			doc.mu.Lock()
			doc.Version--
			doc.mu.Unlock()
		}
	}()

	return UpdateResult{
		Success: true,
		Version: doc.Version,
		Hash:    doc.Hash,
		Content: doc.Content,
	}
}

// GetState returns current document state
func (doc *VersionedDoc) GetState() (string, int64, string) {
	doc.mu.RLock()
	defer doc.mu.RUnlock()
	return doc.Content, doc.Version, doc.Hash
}

// generateHash creates MD5 hash of content
func generateHash(content string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(content)))
}