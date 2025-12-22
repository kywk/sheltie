package database

import (
	"database/sql"
	"os"
	"path/filepath"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// Workspace represents a collaborative workspace
type Workspace struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Content     string    `json:"content"`
	Version     int64     `json:"version"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// WorkspaceVersion represents a version snapshot
type WorkspaceVersion struct {
	ID          int64     `json:"id"`
	WorkspaceID string    `json:"workspaceId"`
	Content     string    `json:"content"`
	CreatedAt   time.Time `json:"createdAt"`
}

var db *sql.DB

// Init initializes the database connection and creates tables
func Init(dbPath string) error {
	// Ensure directory exists
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	var err error
	db, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		return err
	}

	// Create tables
	schema := `
	CREATE TABLE IF NOT EXISTS workspaces (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		description TEXT DEFAULT '',
		content TEXT DEFAULT '',
		version INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS workspace_versions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		workspace_id TEXT NOT NULL,
		content TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_versions_workspace ON workspace_versions(workspace_id);
	`

	_, err = db.Exec(schema)
	if err != nil {
		return err
	}

	// Try to add version column for existing databases (ignore error if already exists)
	_, _ = db.Exec("ALTER TABLE workspaces ADD COLUMN version INTEGER DEFAULT 0")

	return nil
}

// Close closes the database connection
func Close() error {
	if db != nil {
		return db.Close()
	}
	return nil
}

// GetDB returns the database instance
func GetDB() *sql.DB {
	return db
}

// CreateWorkspace creates a new workspace
func CreateWorkspace(ws *Workspace) error {
	_, err := db.Exec(
		"INSERT INTO workspaces (id, name, description, content, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		ws.ID, ws.Name, ws.Description, ws.Content, ws.Version, ws.CreatedAt, ws.UpdatedAt,
	)
	return err
}

// GetWorkspace retrieves a workspace by ID
func GetWorkspace(id string) (*Workspace, error) {
	ws := &Workspace{}
	err := db.QueryRow(
		"SELECT id, name, description, content, version, created_at, updated_at FROM workspaces WHERE id = ?",
		id,
	).Scan(&ws.ID, &ws.Name, &ws.Description, &ws.Content, &ws.Version, &ws.CreatedAt, &ws.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return ws, nil
}

// GetAllWorkspaces retrieves all workspaces
func GetAllWorkspaces() ([]*Workspace, error) {
	rows, err := db.Query("SELECT id, name, description, content, version, created_at, updated_at FROM workspaces ORDER BY updated_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workspaces []*Workspace
	for rows.Next() {
		ws := &Workspace{}
		if err := rows.Scan(&ws.ID, &ws.Name, &ws.Description, &ws.Content, &ws.Version, &ws.CreatedAt, &ws.UpdatedAt); err != nil {
			return nil, err
		}
		workspaces = append(workspaces, ws)
	}
	return workspaces, nil
}

// UpdateWorkspace updates a workspace
func UpdateWorkspace(ws *Workspace) error {
	ws.UpdatedAt = time.Now()
	_, err := db.Exec(
		"UPDATE workspaces SET name = ?, description = ?, content = ?, version = ?, updated_at = ? WHERE id = ?",
		ws.Name, ws.Description, ws.Content, ws.Version, ws.UpdatedAt, ws.ID,
	)
	return err
}

// UpdateWorkspaceContent updates only the content field with version check
func UpdateWorkspaceContentWithVersion(id, content string, expectedVersion int64) (bool, error) {
	result, err := db.Exec(
		"UPDATE workspaces SET content = ?, updated_at = ?, version = version + 1 WHERE id = ? AND version = ?",
		content, time.Now(), id, expectedVersion,
	)
	if err != nil {
		return false, err
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	
	return rowsAffected > 0, nil
}

// UpdateWorkspaceContent updates only the content field
func UpdateWorkspaceContent(id, content string) error {
	_, err := db.Exec(
		"UPDATE workspaces SET content = ?, updated_at = ? WHERE id = ?",
		content, time.Now(), id,
	)
	return err
}

// DeleteWorkspace deletes a workspace
func DeleteWorkspace(id string) error {
	_, err := db.Exec("DELETE FROM workspaces WHERE id = ?", id)
	return err
}

// SaveVersion saves a version snapshot
func SaveVersion(workspaceID, content string) error {
	_, err := db.Exec(
		"INSERT INTO workspace_versions (workspace_id, content, created_at) VALUES (?, ?, ?)",
		workspaceID, content, time.Now(),
	)
	return err
}
