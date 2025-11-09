package handlers

import (
	"net/http"
	"strconv"

	"github.com/danishyusrah/go_bisnis/internal/dto"
	"github.com/danishyusrah/go_bisnis/internal/models"
	"github.com/danishyusrah/go_bisnis/internal/services"
	"github.com/gin-gonic/gin"
)

// ProductHandler menghandle request terkait produk
type ProductHandler struct {
	Service *services.ProductService
}

// NewProductHandler membuat handler produk baru
func NewProductHandler() *ProductHandler {
	return &ProductHandler{
		Service: services.NewProductService(),
	}
}

// helper untuk mengambil userID dari context
func getUserIDFromContext(c *gin.Context) (uint, bool) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Otorisasi gagal"})
		return 0, false
	}
	// Pastikan tipe data sesuai (uint)
	id, ok := userID.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Tipe UserID di context tidak valid"})
		return 0, false
	}
	return id, true
}

// helper untuk mengubah model produk menjadi DTO respons
func toProductResponse(product models.Product) dto.ProductResponse {
	return dto.ProductResponse{
		ID:            product.ID,
		Name:          product.Name,
		SKU:           product.SKU,
		Description:   product.Description,
		PurchasePrice: product.PurchasePrice,
		SellingPrice:  product.SellingPrice,
		Stock:         product.Stock,
		CreatedAt:     product.CreatedAt.String(),
		UpdatedAt:     product.UpdatedAt.String(),
	}
}

// CreateProduct menangani pembuatan produk baru
func (h *ProductHandler) CreateProduct(c *gin.Context) {
	var input dto.CreateProductInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	product, err := h.Service.CreateProduct(input, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat produk"})
		return
	}

	c.JSON(http.StatusCreated, toProductResponse(product))
}

// GetUserProducts menangani pengambilan semua produk milik user
func (h *ProductHandler) GetUserProducts(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	// [BARU] Ambil query parameter "search" dari URL
	// Cth: /api/v1/products?search=kopi
	searchQuery := c.Query("search")

	// [DIPERBARUI] Kirim searchQuery ke service
	products, err := h.Service.GetUserProducts(userID, searchQuery)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data produk"})
		return
	}

	// Ubah list model ke list DTO
	var responses []dto.ProductResponse
	for _, p := range products {
		responses = append(responses, toProductResponse(p))
	}

	c.JSON(http.StatusOK, responses)
}

// GetProductByID menangani pengambilan satu produk
func (h *ProductHandler) GetProductByID(c *gin.Context) {
	productID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID produk tidak valid"})
		return
	}

	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	product, err := h.Service.GetProductByID(uint(productID), userID)
	if err != nil {
		if err.Error() == "produk tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if err.Error() == "akses ditolak: Anda bukan pemilik produk ini" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data produk"})
		return
	}

	c.JSON(http.StatusOK, toProductResponse(product))
}

// UpdateProduct menangani pembaruan produk
func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	productID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID produk tidak valid"})
		return
	}

	var input dto.UpdateProductInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	product, err := h.Service.UpdateProduct(uint(productID), input, userID)
	if err != nil {
		// Error handling sama seperti GetProductByID
		if err.Error() == "produk tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if err.Error() == "akses ditolak: Anda bukan pemilik produk ini" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui produk"})
		return
	}

	c.JSON(http.StatusOK, toProductResponse(product))
}

// DeleteProduct menangani penghapusan produk
func (h *ProductHandler) DeleteProduct(c *gin.Context) {
	productID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID produk tidak valid"})
		return
	}

	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	err = h.Service.DeleteProduct(uint(productID), userID)
	if err != nil {
		// Error handling sama seperti GetProductByID
		if err.Error() == "produk tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if err.Error() == "akses ditolak: Anda bukan pemilik produk ini" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus produk"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Produk berhasil dihapus"})
}
