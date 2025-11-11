package dto

import "github.com/danishyusrah/go_bisnis/internal/models"

// CreateCategoryInput adalah DTO untuk membuat kategori baru
type CreateCategoryInput struct {
	Name string               `json:"name" binding:"required"`
	Type models.CategoryType `json:"type" binding:"required,oneof=INCOME EXPENSE"`
}

// UpdateCategoryInput adalah DTO untuk memperbarui kategori
type UpdateCategoryInput struct {
	Name string               `json:"name" binding:"omitempty"`
	Type models.CategoryType `json:"type" binding:"omitempty,oneof=INCOME EXPENSE"`
}

// CategoryResponse adalah DTO untuk data kategori yang dikirim ke client
type CategoryResponse struct {
	ID   uint                `json:"id"`
	Name string              `json:"name"`
	Type models.CategoryType `json:"type"`
}