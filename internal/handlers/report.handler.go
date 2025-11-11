package handlers

import (
	"net/http"
	"time"

	"github.com/danishyusrah/go_bisnis/internal/services"
	"github.com/gin-gonic/gin"
)

// ReportHandler menghandle request terkait laporan
type ReportHandler struct {
	Service *services.ReportService
}

// NewReportHandler membuat handler laporan baru
func NewReportHandler() *ReportHandler {
	return &ReportHandler{
		Service: services.NewReportService(),
	}
}

// parseDateRangeForReports (helper) mengambil 'from' dan 'to' dari query, atau default ke 'Bulan Ini'
// (Helper ini kita duplikat dari dashboard.handler.go agar file ini bisa mandiri
//
//	karena helper aslinya tidak di-export)
func parseDateRangeForReports(c *gin.Context) (time.Time, time.Time) {
	fromStr := c.Query("from")
	toStr := c.Query("to")

	var startTime, endTime time.Time
	var err error

	// Coba parse 'from'
	if fromStr != "" {
		startTime, err = time.Parse(time.RFC3339, fromStr)
		if err != nil {
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
			endTime = time.Now()
		}
	} else {
		// Default 'to': 'Sekarang'
		// Kita buat akhir hari agar data hari ini masuk
		now := time.Now()
		endTime = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999, now.Location())
	}

	return startTime, endTime
}

// GetProductPerformance menangani permintaan API untuk laporan performa produk
func (h *ReportHandler) GetProductPerformance(c *gin.Context) {
	// 1. Ambil UserID dari context
	userID, ok := getUserIDFromContext(c) // Helper dari product.handler.go (satu package)
	if !ok {
		return
	}

	// 2. Ambil rentang tanggal dari query parameter (cth: ?from=...&to=...)
	startTime, endTime := parseDateRangeForReports(c)

	// 3. Panggil service untuk mengambil data
	report, err := h.Service.GetProductPerformanceReport(userID, startTime, endTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data laporan performa produk"})
		return
	}

	// 4. Kembalikan data sebagai JSON
	c.JSON(http.StatusOK, report)
}

// --- [BARU] FUNGSI UNTUK BUKU BESAR (GENERAL LEDGER) ---

// GetGeneralLedger menangani permintaan API untuk laporan buku besar
func (h *ReportHandler) GetGeneralLedger(c *gin.Context) {
	// 1. Ambil UserID dari context
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	// 2. Ambil rentang tanggal
	startTime, endTime := parseDateRangeForReports(c)

	// 3. Panggil service baru kita
	report, err := h.Service.GetGeneralLedgerReport(userID, startTime, endTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data buku besar"})
		return
	}

	// 4. Kembalikan laporan lengkap sebagai JSON
	c.JSON(http.StatusOK, report)
}

// --- [BARU] FUNGSI UNTUK LAPORAN UTANG/PIUTANG ---

// GetUnpaidReport menangani permintaan API untuk laporan utang & piutang
func (h *ReportHandler) GetUnpaidReport(c *gin.Context) {
	// 1. Ambil UserID dari context
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	// 2. Panggil service (Tidak perlu filter tanggal, kita ingin lihat semua yang belum lunas)
	report, err := h.Service.GetUnpaidReport(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data laporan utang/piutang"})
		return
	}

	// 3. Kembalikan laporan lengkap sebagai JSON
	c.JSON(http.StatusOK, report)
}
