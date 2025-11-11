package handlers

import (
	"net/http"
	"time" // <-- Impor 'time'

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

// --- HELPER (DIHAPUS DARI SINI) ---
// Fungsi getUserIDFromContext sudah ada di product.handler.go
// dan dapat diakses oleh file ini karena berada di package 'handlers' yang sama.
// --- END HELPER ---

// parseDateRange mengambil 'from' dan 'to' dari query, atau default ke 'Bulan Ini'
func parseDateRange(c *gin.Context) (time.Time, time.Time) {
	// ... existing code ...
	// Ambil 'from' dan 'to' dari query string
	fromStr := c.Query("from")
	toStr := c.Query("to")

	var startTime, endTime time.Time
	var err error

	// Coba parse 'from'
	if fromStr != "" {
		startTime, err = time.Parse(time.RFC3339, fromStr)
		if err != nil {
			// Jika format salah, set ke awal 'Bulan Ini'
			now := time.Now()
			startTime = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		}
	} else {
		// Default 'from': Awal 'Bulan Ini'
		now := time.Now()
		startTime = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	}

	// Coba parse 'to'
	if toStr != "" {
		endTime, err = time.Parse(time.RFC3339, toStr)
		if err != nil {
			// Jika format salah, set ke 'Sekarang'
			endTime = time.Now()
		}
	} else {
		// Default 'to': Akhir 'Bulan Ini' (atau 'Sekarang' jika lebih praktis)
		// Kita gunakan 'Sekarang' agar data real-time hari ini tetap masuk
		endTime = time.Now()
	}

	return startTime, endTime
}

// GetDashboardStats menangani permintaan statistik dashboard
func (h *DashboardHandler) GetDashboardStats(c *gin.Context) {
	// ... existing code ...
	// Ambil userID dari context (yang di-set oleh middleware)
	userID, ok := getUserIDFromContext(c) // Kita gunakan helper yang sama dari product.handler.go
	if !ok {
		// getUserIDFromContext sudah mengirim respons error
		return
	}

	// [BARU] Dapatkan rentang waktu dari query
	startTime, endTime := parseDateRange(c)

	// Panggil service untuk mendapatkan statistik
	// [DIPERBARUI] Kirim rentang waktu ke service
	stats, err := h.Service.GetDashboardStats(userID, startTime, endTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data dashboard"})
		return
	}

	// Kirim statistik sebagai respons
	c.JSON(http.StatusOK, stats)
}

// --- BARU UNTUK FITUR GRAFIK ---

// GetDashboardChartData menangani permintaan data untuk grafik
func (h *DashboardHandler) GetDashboardChartData(c *gin.Context) {
	// ... existing code ...
	// 1. Ambil UserID
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	// 2. Ambil rentang tanggal (menggunakan helper yang sama)
	startTime, endTime := parseDateRange(c)

	// 3. Panggil service baru kita
	chartData, err := h.Service.GetDashboardChartData(userID, startTime, endTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data untuk grafik"})
		return
	}

	// 4. Kirim data sebagai respons
	c.JSON(http.StatusOK, chartData)
}

// --- [BARU UNTUK FITUR STOK MINIMUM] ---

// GetLowStockProducts menangani permintaan untuk produk yang stoknya menipis
func (h *DashboardHandler) GetLowStockProducts(c *gin.Context) {
	// 1. Ambil UserID
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	// 2. Panggil service baru kita
	lowStockProducts, err := h.Service.GetLowStockProducts(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data stok menipis"})
		return
	}

	// 3. Kirim data sebagai respons
	c.JSON(http.StatusOK, lowStockProducts)
}

// --- [AKHIR BARU] ---
