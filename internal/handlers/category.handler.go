package handlers

import (
	"net/http"
	"strconv"

	"github.com/danishyusrah/go_bisnis/internal/dto"
	"github.com/danishyusrah/go_bisnis/internal/models"
	"github.com/danishyusrah/go_bisnis/internal/services"
	"github.com/gin-gonic/gin"
)

// CategoryHandler menghandle request terkait kategori
type CategoryHandler struct {
	Service *services.CategoryService
}

// NewCategoryHandler membuat handler kategori baru
func NewCategoryHandler() *CategoryHandler {
	return &CategoryHandler{
		Service: services.NewCategoryService(),
	}
}

// helper untuk mengubah model kategori menjadi DTO respons
func toCategoryResponse(category models.Category) dto.CategoryResponse {
	return dto.CategoryResponse{
		ID:   category.ID,
		Name: category.Name,
		Type: category.Type,
	}
}

// CreateCategory menangani pembuatan kategori baru
func (h *CategoryHandler) CreateCategory(c *gin.Context) {
	var input dto.CreateCategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Gunakan helper yang sudah ada di product.handler.go (karena package-nya sama)
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	category, err := h.Service.CreateCategory(input, userID)
	if err != nil {
		// Cek error duplikat
		if err.Error() == "kategori dengan nama dan tipe yang sama sudah ada" {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat kategori"})
		return
	}

	c.JSON(http.StatusCreated, toCategoryResponse(category))
}

// GetUserCategories menangani pengambilan semua kategori milik user
func (h *CategoryHandler) GetUserCategories(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	categories, err := h.Service.GetUserCategories(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data kategori"})
		return
	}

	// Ubah list model ke list DTO
	var responses []dto.CategoryResponse
	for _, cat := range categories {
		responses = append(responses, toCategoryResponse(cat))
	}

	c.JSON(http.StatusOK, responses)
}

// UpdateCategory menangani pembaruan kategori
func (h *CategoryHandler) UpdateCategory(c *gin.Context) {
	categoryID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID kategori tidak valid"})
		return
	}

	var input dto.UpdateCategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	category, err := h.Service.UpdateCategory(uint(categoryID), input, userID)
	if err != nil {
		if err.Error() == "kategori tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if err.Error() == "akses ditolak: Anda bukan pemilik kategori ini" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui kategori"})
		return
	}

	c.JSON(http.StatusOK, toCategoryResponse(category))
}

// DeleteCategory menangani penghapusan kategori
func (h *CategoryHandler) DeleteCategory(c *gin.Context) {
	categoryID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID kategori tidak valid"})
		return
	}

	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	err = h.Service.DeleteCategory(uint(categoryID), userID)
	if err != nil {
		if err.Error() == "kategori tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if err.Error() == "akses ditolak: Anda bukan pemilik kategori ini" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		// Tangani error "sedang dipakai"
		if err.Error() == "kategori tidak dapat dihapus karena masih digunakan oleh transaksi" {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()}) // 409 Conflict
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus kategori"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Kategori berhasil dihapus"})
}
