package handlers

import (
	"net/http"

	"github.com/danishyusrah/go_bisnis/internal/services"
	"github.com/gin-gonic/gin"
)

// DashboardHandler menghandle request terkait dashboard
type DashboardHandler struct {
	Service *services.DashboardService
}

// NewDashboardHandler membuat handler dashboard baru
func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{
		Service: services.NewDashboardService(),
	}
}

// GetDashboardStats menangani permintaan statistik dashboard
func (h *DashboardHandler) GetDashboardStats(c *gin.Context) {
	// Ambil userID dari context (yang di-set oleh middleware)
	userID, ok := getUserIDFromContext(c) // Kita gunakan helper yang sama dari product.handler.go
	if !ok {
		// getUserIDFromContext sudah mengirim respons error
		return
	}

	// Panggil service untuk mendapatkan statistik
	stats, err := h.Service.GetDashboardStats(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data dashboard"})
		return
	}

	// Kirim statistik sebagai respons
	c.JSON(http.StatusOK, stats)
}
