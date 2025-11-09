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
// [DIPERBARUI] Sekarang menerima rentang waktu sebagai parameter
func (s *DashboardService) GetDashboardStats(userID uint, startTime time.Time, endTime time.Time) (dto.DashboardStats, error) {
	db := database.DB
	var stats dto.DashboardStats

	// 1. Tentukan rentang waktu (DIHAPUS: Logika 'Bulan Ini' dipindahkan ke handler)
	// now := time.Now()
	// startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	// endOfMonth := startOfMonth.AddDate(0, 1, 0).Add(-time.Nanosecond) // Awal bulan depan, dikurangi 1 nano

	log.Printf("Menghitung statistik dashboard untuk UserID %d dari %s hingga %s", userID, startTime, endTime)

	// 2. Query untuk menghitung Total Pemasukan
	// Kita gunakan 'struct scan' untuk hasil agregat
	type SumResult struct {
		Total float64
	}
	var incomeResult SumResult
	if err := db.Model(&models.Transaction{}).
		Select("COALESCE(SUM(total_amount), 0) as total").
		Where("user_id = ? AND type = ? AND created_at BETWEEN ? AND ?", userID, models.Income, startTime, endTime).
		Scan(&incomeResult).Error; err != nil {
		log.Printf("Error querying total income: %v", err)
		return stats, err
	}
	stats.TotalIncome = incomeResult.Total

	// 3. Query untuk menghitung Total Pengeluaran
	var expenseResult SumResult
	if err := db.Model(&models.Transaction{}).
		Select("COALESCE(SUM(total_amount), 0) as total").
		Where("user_id = ? AND type = ? AND created_at BETWEEN ? AND ?", userID, models.Expense, startTime, endTime).
		Scan(&expenseResult).Error; err != nil {
		log.Printf("Error querying total expense: %v", err)
		return stats, err
	}
	stats.TotalExpense = expenseResult.Total

	// 4. Query untuk menghitung Jumlah Transaksi
	var count int64
	if err := db.Model(&models.Transaction{}).
		Where("user_id = ? AND created_at BETWEEN ? AND ?", userID, startTime, endTime).
		Count(&count).Error; err != nil {
		log.Printf("Error querying transaction count: %v", err)
		return stats, err
	}
	stats.TransactionCount = count

	// 5. Hitung Laba Bersih
	stats.NetProfit = stats.TotalIncome - stats.TotalExpense

	return stats, nil
}

// --- BARU UNTUK FITUR GRAFIK ---

// DailyTotal adalah struct helper untuk hasil query agregat data harian
type DailyTotal struct {
	Day          time.Time `gorm:"column:day"` // Ini penting untuk GORM scan
	IncomeTotal  float64   `gorm:"column:income_total"`
	ExpenseTotal float64   `gorm:"column:expense_total"`
}

// GetDashboardChartData adalah logika bisnis untuk mengambil data harian untuk grafik
func (s *DashboardService) GetDashboardChartData(userID uint, startTime time.Time, endTime time.Time) (dto.ChartDataResponse, error) {
	db := database.DB
	var response dto.ChartDataResponse
	var results []DailyTotal

	// 1. Query Agregat Harian
	// Ini adalah query profesional yang menggunakan conditional aggregation (CASE WHEN)
	// untuk mem-pivot data 'type' menjadi kolom 'income_total' dan 'expense_total'
	err := db.Model(&models.Transaction{}).
		Select("DATE(created_at) as day, SUM(CASE WHEN type = ? THEN total_amount ELSE 0 END) as income_total, SUM(CASE WHEN type = ? THEN total_amount ELSE 0 END) as expense_total", models.Income, models.Expense).
		Where("user_id = ? AND created_at BETWEEN ? AND ?", userID, startTime, endTime).
		Group("DATE(created_at)").
		Order("day ASC").
		Scan(&results).Error

	if err != nil {
		log.Printf("Error querying chart data: %v", err)
		return response, err
	}

	// 2. Buat Peta (Map) untuk pencarian data yang efisien
	// Ini akan menyimpan data yang kita dapat dari DB
	dataMap := make(map[string]DailyTotal)
	for _, r := range results {
		dayStr := r.Day.Format("2006-01-02") // Kunci Peta: "2025-11-08"
		dataMap[dayStr] = r
	}

	// 3. Isi hari-hari yang kosong (Gap Filling)
	// Kita iterasi dari startTime hingga endTime, hari demi hari.
	// Jika satu hari tidak ada di 'dataMap', kita isi dengan 0.
	// Ini memastikan grafik di frontend tidak "bolong-bolong".

	// Normalisasi waktu ke awal hari untuk loop yang konsisten
	loc := startTime.Location()
	loopStart := time.Date(startTime.Year(), startTime.Month(), startTime.Day(), 0, 0, 0, 0, loc)
	loopEnd := time.Date(endTime.Year(), endTime.Month(), endTime.Day(), 0, 0, 0, 0, loc)

	for d := loopStart; !d.After(loopEnd); d = d.AddDate(0, 0, 1) {
		dayStr := d.Format("2006-01-02")
		labelFormat := d.Format("02 Jan") // Label "08 Nov"

		var dailyIncome float64 = 0
		var dailyExpense float64 = 0

		// Cek apakah ada data di peta untuk hari ini
		if data, ok := dataMap[dayStr]; ok {
			dailyIncome = data.IncomeTotal
			dailyExpense = data.ExpenseTotal
		}

		// Tambahkan data (walaupun 0) ke respons
		response.Labels = append(response.Labels, labelFormat)
		response.IncomeData = append(response.IncomeData, dailyIncome)
		response.ExpenseData = append(response.ExpenseData, dailyExpense)
	}

	// Jika tidak ada data sama sekali (rentang 0 hari?), pastikan slice tidak nil
	if response.Labels == nil {
		response.Labels = []string{}
		response.IncomeData = []float64{}
		response.ExpenseData = []float64{}
	}

	return response, nil
}
