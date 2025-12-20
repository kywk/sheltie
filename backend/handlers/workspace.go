package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kywk/sheltie/backend/database"
)

// WorkspaceResponse represents the API response for a workspace
type WorkspaceResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Content     string    `json:"content"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// WorkspaceListItem represents a simplified workspace for listing
type WorkspaceListItem struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// GetWorkspace handles GET /api/workspaces/:id
func GetWorkspace(c *gin.Context) {
	id := c.Param("id")

	ws, err := database.GetWorkspace(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
		return
	}

	c.JSON(http.StatusOK, WorkspaceResponse{
		ID:          ws.ID,
		Name:        ws.Name,
		Description: ws.Description,
		Content:     ws.Content,
		CreatedAt:   ws.CreatedAt,
		UpdatedAt:   ws.UpdatedAt,
	})
}

// UpdateWorkspaceRequest represents the request body for updating a workspace
type UpdateWorkspaceRequest struct {
	Content string `json:"content"`
}

// UpdateWorkspace handles PUT /api/workspaces/:id
func UpdateWorkspace(c *gin.Context) {
	id := c.Param("id")

	var req UpdateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ws, err := database.GetWorkspace(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
		return
	}

	ws.Content = req.Content
	if err := database.UpdateWorkspace(ws); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update workspace"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Workspace updated"})
}

// CreateWorkspaceRequest represents the request body for creating a workspace
type CreateWorkspaceRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// CreateWorkspace handles POST /api/admin/workspaces
func CreateWorkspace(c *gin.Context) {
	var req CreateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}

	ws := &database.Workspace{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Description: req.Description,
		Content:     getDefaultContent(req.Name),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := database.CreateWorkspace(ws); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workspace"})
		return
	}

	c.JSON(http.StatusCreated, WorkspaceResponse{
		ID:          ws.ID,
		Name:        ws.Name,
		Description: ws.Description,
		Content:     ws.Content,
		CreatedAt:   ws.CreatedAt,
		UpdatedAt:   ws.UpdatedAt,
	})
}

// ListWorkspaces handles GET /api/admin/workspaces
func ListWorkspaces(c *gin.Context) {
	workspaces, err := database.GetAllWorkspaces()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list workspaces"})
		return
	}

	items := make([]WorkspaceListItem, len(workspaces))
	for i, ws := range workspaces {
		items[i] = WorkspaceListItem{
			ID:          ws.ID,
			Name:        ws.Name,
			Description: ws.Description,
			UpdatedAt:   ws.UpdatedAt,
		}
	}

	c.JSON(http.StatusOK, items)
}

// UpdateWorkspaceInfoRequest represents the request body for updating workspace info
type UpdateWorkspaceInfoRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// UpdateWorkspaceInfo handles PUT /api/admin/workspaces/:id
func UpdateWorkspaceInfo(c *gin.Context) {
	id := c.Param("id")

	var req UpdateWorkspaceInfoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ws, err := database.GetWorkspace(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
		return
	}

	if req.Name != "" {
		ws.Name = req.Name
	}
	if req.Description != "" {
		ws.Description = req.Description
	}

	if err := database.UpdateWorkspace(ws); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update workspace"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Workspace updated"})
}

// DeleteWorkspace handles DELETE /api/admin/workspaces/:id
func DeleteWorkspace(c *gin.Context) {
	id := c.Param("id")

	if err := database.DeleteWorkspace(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete workspace"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Workspace deleted"})
}

// getDefaultContent returns the default markdown template for a new workspace
func getDefaultContent(name string) string {
	return `# ` + name + `

## 基本資訊
- 燈號: 綠
- 目前狀態: 提案準備中
- 進度: 0%
- 窗口: 
- 各階段日期:
  - 開發: 
  - SIT: 
  - QAS: 
  - REG: 
- 相關單位: 
    - 主辦:
    - 協辦/協同:
- 分類: 

## 會辦狀況 (日期反序)

- ` + time.Now().Format("2006-01-02") + `
  - 現況: 

## 其他補充
- 
`
}
