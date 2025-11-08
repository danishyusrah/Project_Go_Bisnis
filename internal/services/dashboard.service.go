package services

import (
	"log"
	"time"

	"github.com/danishyusrah/go_bisnis/internal/database"
	"github.com/danishyusrah/go_bisnis/internal/dto"
	"github.com/danishyusrah/go_bisnis/internal/models"
)

// DashboardService adalah struct untuk layanan terkait dashboard
type DashboardService struct{}

// NewDashboardService membuat instance DashboardService baru
func NewDashboardService() *DashboardService {
	return &DashboardService{}
}

// GetDashboardStats adalah logika bisnis untuk mengambil statistik dashboard
// Ini adalah query yang "profesional" untuk agregasi data
func (s *DashboardService) GetDashboardStats(userID uint) (dto.DashboardStats, error) {
	db := database.DB
	var stats dto.DashboardStats

	// 1. Tentukan rentang waktu (bulan ini)
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	endOfMonth := startOfMonth.AddDate(0, 1, 0).Add(-time.Nanosecond) // Awal bulan depan, dikurangi 1 nano

	log.Printf("Menghitung statistik dashboard untuk UserID %d dari %s hingga %s", userID, startOfMonth, endOfMonth)

	// 2. Query untuk menghitung Total Pemasukan (bulan ini)
	// Kita gunakan 'struct scan' untuk hasil agregat
	type SumResult struct {
		Total float64
	}
	var incomeResult SumResult
	if err := db.Model(&models.Transaction{}).
		Select("COALESCE(SUM(total_amount), 0) as total").
		Where("user_id = ? AND type = ? AND created_at BETWEEN ? AND ?", userID, models.Income, startOfMonth, endOfMonth).
		Scan(&incomeResult).Error; err != nil {
		log.Printf("Error querying total income: %v", err)
		return stats, err
	}
	stats.TotalIncome = incomeResult.Total

	// 3. Query untuk menghitung Total Pengeluaran (bulan ini)
	var expenseResult SumResult
	if err := db.Model(&models.Transaction{}).
		Select("COALESCE(SUM(total_amount), 0) as total").
		Where("user_id = ? AND type = ? AND created_at BETWEEN ? AND ?", userID, models.Expense, startOfMonth, endOfMonth).
		Scan(&expenseResult).Error; err != nil {
		log.Printf("Error querying total expense: %v", err)
		return stats, err
	}
	stats.TotalExpense = expenseResult.Total

	// 4. Query untuk menghitung Jumlah Transaksi (bulan ini)
	var count int64
	if err := db.Model(&models.Transaction{}).
		Where("user_id = ? AND created_at BETWEEN ? AND ?", userID, startOfMonth, endOfMonth).
		Count(&count).Error; err != nil {
		log.Printf("Error querying transaction count: %v", err)
		return stats, err
	}
	stats.TransactionCount = count

	// 5. Hitung Laba Bersih
	stats.NetProfit = stats.TotalIncome - stats.TotalExpense

	return stats, nil
}
