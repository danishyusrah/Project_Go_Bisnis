package dto

// ProductPerformanceReport adalah DTO untuk data performa produk
type ProductPerformanceReport struct {
	ProductID    *uint   `json:"product_id"`    // ID produk, bisa null jika item kustom
	ProductName  string  `json:"product_name"`  // Nama produk
	TotalSold    int64   `json:"total_sold"`    // Total kuantitas terjual
	TotalRevenue float64 `json:"total_revenue"` // Total pendapatan dari produk ini
}

// --- [BARU] Struct untuk Laporan Buku Besar (General Ledger) ---

// LedgerEntry mewakili satu baris/entri dalam buku besar
type LedgerEntry struct {
	Date        string  `json:"date"`        // Tanggal transaksi (diformat)
	Description string  `json:"description"` // Keterangan (cth: "Penjualan: Kopi Susu" atau "Biaya: Listrik")
	Debit       float64 `json:"debit"`       // Uang Keluar (Pengeluaran)
	Credit      float64 `json:"credit"`      // Uang Masuk (Pemasukan)
	Balance     float64 `json:"balance"`     // Saldo berjalan
}

// GeneralLedgerReport adalah DTO lengkap untuk laporan buku besar
type GeneralLedgerReport struct {
	BeginningBalance float64       `json:"beginning_balance"` // Saldo Awal
	Entries          []LedgerEntry `json:"entries"`           // Daftar semua entri transaksi
	TotalDebit       float64       `json:"total_debit"`
	TotalCredit      float64       `json:"total_credit"`
	EndingBalance    float64       `json:"ending_balance"` // Saldo Akhir
}

// --- [BARU] Struct untuk Laporan Utang & Piutang ---

// UnpaidTransactionItem adalah DTO untuk satu transaksi yang belum lunas
type UnpaidTransactionItem struct {
	TransactionID uint    `json:"transaction_id"`
	CustomerName  string  `json:"customer_name"` // Nama Pelanggan (Piutang) or Supplier (Utang)
	Amount        float64 `json:"amount"`
	CreatedAt     string  `json:"created_at"`
	DueDate       *string `json:"due_date"`     // "YYYY-MM-DD" or null
	IsOverdue     bool    `json:"is_overdue"`   // Dihitung di backend
	PrimaryItem   string  `json:"primary_item"` // Nama item pertama
}

// UnpaidReport adalah DTO lengkap untuk laporan utang/piutang
type UnpaidReport struct {
	TotalReceivable float64                 `json:"total_receivable"` // Total Piutang (INCOME belum lunas)
	TotalPayable    float64                 `json:"total_payable"`    // Total Utang (EXPENSE belum lunas)
	Receivables     []UnpaidTransactionItem `json:"receivables"`      // Daftar Piutang
	Payables        []UnpaidTransactionItem `json:"payables"`         // Daftar Utang
}
