package dto

// DashboardStats adalah DTO untuk ringkasan statistik di dashboard
type DashboardStats struct {
	// [DIUBAH] Nama field dan penambahan field baru
	TotalRevenue     float64 `json:"total_revenue"`     // Total Pemasukan Kotor (Total Penjualan)
	TotalCOGS        float64 `json:"total_cogs"`        // Total Modal (HPP) dari barang terjual
	GrossProfit      float64 `json:"gross_profit"`      // Laba Kotor (Revenue - COGS)
	TotalExpense     float64 `json:"total_expense"`     // Total Pengeluaran (Biaya operasional)
	NetProfit        float64 `json:"net_profit"`        // Laba Bersih (GrossProfit - Expense)
	TransactionCount int64   `json:"transaction_count"` // Jumlah transaksi (Pemasukan + Pengeluaran)
	// TotalIncome (lama) dihapus
}

// --- BARU UNTUK FITUR GRAFIK ---

// ChartDataResponse adalah DTO untuk data yang akan di-render oleh Chart.js
type ChartDataResponse struct {
	Labels          []string  `json:"labels"`            // Sumbu X (e.g., ["01 Nov", "02 Nov", ...])
	RevenueData     []float64 `json:"revenue_data"`      // [NAMA BARU] Data Pemasukan Kotor (Penjualan)
	GrossProfitData []float64 `json:"gross_profit_data"` // [BARU] Data Laba Kotor (Revenue - COGS)
	ExpenseData     []float64 `json:"expense_data"`      // Data Pengeluaran
	// IncomeData (lama) dihapus
}

// --- [BARU UNTUK FITUR STOK MINIMUM] ---

// LowStockProduct adalah DTO untuk satu produk yang stoknya menipis
type LowStockProduct struct {
	ProductID        uint   `json:"product_id"`
	Name             string `json:"name"`
	Stock            int    `json:"stock"`
	BatasStokMinimum int    `json:"batas_stok_minimum"`
}

// --- [AKHIR BARU] ---
