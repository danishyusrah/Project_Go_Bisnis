package handlers

import (
	"net/http"
	"strconv"

	"github.com/danishyusrah/go_bisnis/internal/dto"
	"github.com/danishyusrah/go_bisnis/internal/models"
	"github.com/danishyusrah/go_bisnis/internal/services"
	"github.com/gin-gonic/gin"
)

// CustomerHandler menghandle request terkait pelanggan
type CustomerHandler struct {
	Service *services.CustomerService
}

// NewCustomerHandler membuat handler pelanggan baru
func NewCustomerHandler() *CustomerHandler {
	return &CustomerHandler{
		Service: services.NewCustomerService(),
	}
}

// helper untuk mengubah model pelanggan menjadi DTO respons
func toCustomerResponse(customer models.Customer) dto.CustomerResponse {
	return dto.CustomerResponse{
		ID:        customer.ID,
		Name:      customer.Name,
		Email:     customer.Email,
		Phone:     customer.Phone,
		Address:   customer.Address,
		CreatedAt: customer.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt: customer.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
}

// CreateCustomer menangani pembuatan pelanggan baru
func (h *CustomerHandler) CreateCustomer(c *gin.Context) {
	var input dto.CreateCustomerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Gunakan helper yang sudah ada di product.handler.go (karena package-nya sama)
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	customer, err := h.Service.CreateCustomer(input, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat pelanggan"})
		return
	}

	c.JSON(http.StatusCreated, toCustomerResponse(customer))
}

// GetUserCustomers menangani pengambilan semua pelanggan milik user
func (h *CustomerHandler) GetUserCustomers(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	customers, err := h.Service.GetUserCustomers(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data pelanggan"})
		return
	}

	// Ubah list model ke list DTO
	var responses []dto.CustomerResponse
	for _, cust := range customers {
		responses = append(responses, toCustomerResponse(cust))
	}

	c.JSON(http.StatusOK, responses)
}

// GetCustomerByID menangani pengambilan satu pelanggan
func (h *CustomerHandler) GetCustomerByID(c *gin.Context) {
	customerID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID pelanggan tidak valid"})
		return
	}

	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	customer, err := h.Service.GetCustomerByID(uint(customerID), userID)
	if err != nil {
		if err.Error() == "pelanggan tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if err.Error() == "akses ditolak: Anda bukan pemilik pelanggan ini" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data pelanggan"})
		return
	}

	c.JSON(http.StatusOK, toCustomerResponse(customer))
}

// UpdateCustomer menangani pembaruan pelanggan
func (h *CustomerHandler) UpdateCustomer(c *gin.Context) {
	customerID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID pelanggan tidak valid"})
		return
	}

	var input dto.UpdateCustomerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	customer, err := h.Service.UpdateCustomer(uint(customerID), input, userID)
	if err != nil {
		if err.Error() == "pelanggan tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if err.Error() == "akses ditolak: Anda bukan pemilik pelanggan ini" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui pelanggan"})
		return
	}

	c.JSON(http.StatusOK, toCustomerResponse(customer))
}

// DeleteCustomer menangani penghapusan pelanggan
func (h *CustomerHandler) DeleteCustomer(c *gin.Context) {
	customerID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID pelanggan tidak valid"})
		return
	}

	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	err = h.Service.DeleteCustomer(uint(customerID), userID)
	if err != nil {
		if err.Error() == "pelanggan tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if err.Error() == "akses ditolak: Anda bukan pemilik pelanggan ini" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus pelanggan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pelanggan berhasil dihapus"})
}
