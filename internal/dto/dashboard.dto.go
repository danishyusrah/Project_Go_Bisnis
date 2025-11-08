package dto

// DashboardStats adalah DTO untuk ringkasan statistik di dashboard
type DashboardStats struct {
	TotalIncome      float64 `json:"total_income"`      // Total Pemasukan (bulan ini)
	TotalExpense     float64 `json:"total_expense"`     // Total Pengeluaran (bulan ini)
	NetProfit        float64 `json:"net_profit"`        // Laba Bersih (Pemasukan - Pengeluaran)
	TransactionCount int64   `json:"transaction_count"` // Jumlah transaksi (bulan ini)
}
