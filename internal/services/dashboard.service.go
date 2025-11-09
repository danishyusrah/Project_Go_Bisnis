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
// [DIPERBARUI] Logika query diubah total untuk kalkulasi Laba Kotor dan Laba Bersih
func (s *DashboardService) GetDashboardStats(userID uint, startTime time.Time, endTime time.Time) (dto.DashboardStats, error) {
	db := database.DB
	var stats dto.DashboardStats

	log.Printf("Menghitung statistik dashboard baru (dengan COGS) untuk UserID %d dari %s hingga %s", userID, startTime, endTime)

	// --- 1. Kalkulasi Pemasukan (Revenue) dan Modal (COGS) ---
	// Query ini sudah benar, karena HANYA mencari 'models.Income'
	type RevenueCOGSResult struct {
		TotalRevenue float64 `gorm:"column:total_revenue"`
		TotalCOGS    float64 `gorm:"column:total_cogs"`
	}
	var revenueCOGS RevenueCOGSResult

	err := db.Model(&models.Transaction{}).
		Select("COALESCE(SUM(CASE WHEN transactions.type = ? THEN transactions.total_amount ELSE 0 END), 0) as total_revenue, COALESCE(SUM(T_Items.total_cogs), 0) as total_cogs", models.Income).
		Joins("LEFT JOIN (SELECT transaction_id, SUM(purchase_price * quantity) as total_cogs FROM transaction_items GROUP BY transaction_id) AS T_Items ON T_Items.transaction_id = transactions.id").
		Where("transactions.user_id = ? AND transactions.type = ? AND transactions.created_at BETWEEN ? AND ?", userID, models.Income, startTime, endTime).
		Scan(&revenueCOGS).Error

	if err != nil {
		log.Printf("Error querying total revenue/cogs: %v", err)
		return stats, err
	}
	stats.TotalRevenue = revenueCOGS.TotalRevenue
	stats.TotalCOGS = revenueCOGS.TotalCOGS

	// --- 2. Query untuk menghitung Total Pengeluaran (Biaya Operasional) ---
	// Query ini sudah benar, karena HANYA mencari 'models.Expense'
	type SumResult struct {
		Total float64
	}
	var expenseResult SumResult
	if err := db.Model(&models.Transaction{}).
		Select("COALESCE(SUM(total_amount), 0) as total").
		Where("user_id = ? AND type = ? AND created_at BETWEEN ? AND ?", userID, models.Expense, startTime, endTime).
		Scan(&expenseResult).Error; err != nil {
		log.Printf("Error querying total expense: %v", err)
		return stats, err
	}
	stats.TotalExpense = expenseResult.Total

	// --- 3. Query untuk menghitung Jumlah Transaksi (Pemasukan + Pengeluaran) ---
	var count int64
	// [PERUBAHAN DI SINI]
	// Kita tambahkan filter `type IN (?, ?)` agar TIDAK menghitung 'CAPITAL'
	if err := db.Model(&models.Transaction{}).
		Where("user_id = ? AND type IN (?, ?) AND created_at BETWEEN ? AND ?", userID, models.Income, models.Expense, startTime, endTime).
		Count(&count).Error; err != nil {
		log.Printf("Error querying transaction count: %v", err)
		return stats, err
	}
	stats.TransactionCount = count

	// --- 4. Hitung Laba Kotor dan Laba Bersih ---
	stats.GrossProfit = stats.TotalRevenue - stats.TotalCOGS
	stats.NetProfit = stats.GrossProfit - stats.TotalExpense

	return stats, nil
}

// --- BARU UNTUK FITUR GRAFIK ---

// [DIPERBARUI] Helper struct untuk data agregat harian
type DailyChartData struct {
	Day     time.Time `gorm:"column:day"`
	Revenue float64   `gorm:"column:revenue"` // Total Penjualan
	COGS    float64   `gorm:"column:cogs"`    // Total Modal
	Expense float64   `gorm:"column:expense"` // Total Biaya
}

// [DIPERBARUI] GetDashboardChartData adalah logika bisnis untuk mengambil data harian untuk grafik
func (s *DashboardService) GetDashboardChartData(userID uint, startTime time.Time, endTime time.Time) (dto.ChartDataResponse, error) {
	db := database.DB
	var response dto.ChartDataResponse

	// [PERHATIAN] Query ini harus diubah total untuk menghindari perkalian ganda.
	// Kita akan menggunakan 2 query terpisah dan menggabungkannya di Go.

	// 1. Helper struct untuk Query Pendapatan & COGS
	type DailyIncomeCOGS struct {
		Day     time.Time `gorm:"column:day"`
		Revenue float64   `gorm:"column:revenue"`
		COGS    float64   `gorm:"column:cogs"`
	}
	var incomeData []DailyIncomeCOGS

	// Query 1: Ambil data Pendapatan (Revenue) dan Modal (COGS) harian
	// Query ini sudah benar, karena HANYA mencari 'models.Income'
	err := db.Model(&models.Transaction{}).
		Select("DATE(transactions.created_at) as day, SUM(transactions.total_amount) as revenue, SUM(T_Items.total_cogs) as cogs").
		Joins("LEFT JOIN (SELECT transaction_id, SUM(purchase_price * quantity) as total_cogs FROM transaction_items GROUP BY transaction_id) AS T_Items ON T_Items.transaction_id = transactions.id").
		Where("transactions.user_id = ? AND transactions.type = ? AND transactions.created_at BETWEEN ? AND ?", userID, models.Income, startTime, endTime).
		Group("DATE(transactions.created_at)").
		Order("day ASC").
		Scan(&incomeData).Error

	if err != nil {
		log.Printf("Error querying chart income/cogs data: %v", err)
		return response, err
	}

	// 2. Helper struct untuk Query Pengeluaran
	type DailyExpense struct {
		Day     time.Time `gorm:"column:day"`
		Expense float64   `gorm:"column:expense"`
	}
	var expenseData []DailyExpense

	// Query 2: Ambil data Pengeluaran (Expense) harian
	// Query ini sudah benar, karena HANYA mencari 'models.Expense'
	err = db.Model(&models.Transaction{}).
		Select("DATE(created_at) as day, SUM(total_amount) as expense").
		Where("user_id = ? AND type = ? AND created_at BETWEEN ? AND ?", userID, models.Expense, startTime, endTime).
		Group("DATE(created_at)").
		Order("day ASC").
		Scan(&expenseData).Error

	if err != nil {
		log.Printf("Error querying chart expense data: %v", err)
		return response, err
	}

	// 3. Buat Peta (Map) untuk penggabungan data yang efisien
	incomeMap := make(map[string]DailyIncomeCOGS)
	for _, r := range incomeData {
		dayStr := r.Day.Format("2006-01-02")
		incomeMap[dayStr] = r
	}
	expenseMap := make(map[string]DailyExpense)
	for _, r := range expenseData {
		dayStr := r.Day.Format("2006-01-02")
		expenseMap[dayStr] = r
	}

	// 4. Isi hari-hari yang kosong (Gap Filling)
	loc := startTime.Location()
	loopStart := time.Date(startTime.Year(), startTime.Month(), startTime.Day(), 0, 0, 0, 0, loc)
	loopEnd := time.Date(endTime.Year(), endTime.Month(), endTime.Day(), 0, 0, 0, 0, loc)

	for d := loopStart; !d.After(loopEnd); d = d.AddDate(0, 0, 1) {
		dayStr := d.Format("2006-01-02")
		labelFormat := d.Format("02 Jan")

		var dailyRevenue float64 = 0
		var dailyCOGS float64 = 0
		var dailyExpense float64 = 0

		if data, ok := incomeMap[dayStr]; ok {
			dailyRevenue = data.Revenue
			dailyCOGS = data.COGS
		}
		if data, ok := expenseMap[dayStr]; ok {
			dailyExpense = data.Expense
		}

		dailyGrossProfit := dailyRevenue - dailyCOGS

		// Tambahkan data (walaupun 0) ke respons
		response.Labels = append(response.Labels, labelFormat)
		response.RevenueData = append(response.RevenueData, dailyRevenue)
		response.GrossProfitData = append(response.GrossProfitData, dailyGrossProfit)
		response.ExpenseData = append(response.ExpenseData, dailyExpense)
	}

	// Jika tidak ada data sama sekali (rentang 0 hari?), pastikan slice tidak nil
	if response.Labels == nil {
		response.Labels = []string{}
		response.RevenueData = []float64{}
		response.GrossProfitData = []float64{}
		response.ExpenseData = []float64{}
	}

	return response, nil
}
