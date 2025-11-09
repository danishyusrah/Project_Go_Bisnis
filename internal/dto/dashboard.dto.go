package dto

// DashboardStats adalah DTO untuk ringkasan statistik di dashboard
type DashboardStats struct {
	TotalIncome      float64 `json:"total_income"`      // Total Pemasukan (bulan ini)
	TotalExpense     float64 `json:"total_expense"`     // Total Pengeluaran (bulan ini)
	NetProfit        float64 `json:"net_profit"`        // Laba Bersih (Pemasukan - Pengeluaran)
	TransactionCount int64   `json:"transaction_count"` // Jumlah transaksi (bulan ini)
}

// --- BARU UNTUK FITUR GRAFIK ---

// ChartDataResponse adalah DTO untuk data yang akan di-render oleh Chart.js
type ChartDataResponse struct {
	Labels      []string  `json:"labels"`       // Sumbu X (e.g., ["01 Nov", "02 Nov", ...])
	IncomeData  []float64 `json:"income_data"`  // Data Pemasukan (e.g., [50000, 75000, ...])
	ExpenseData []float64 `json:"expense_data"` // Data Pengeluaran (e.g., [10000, 5000, ...])
}
