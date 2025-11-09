package models

import (
	"time" // Pastikan import time ada

	"gorm.io/gorm"
)

// TransactionType mendefinisikan tipe transaksi (Pemasukan/Pengeluaran)
type TransactionType string

const (
	Income  TransactionType = "INCOME"  // Pemasukan, misal: Penjualan
	Expense TransactionType = "EXPENSE" // Pengeluaran, misal: Beli bahan, Bayar Gaji
	Capital TransactionType = "CAPITAL" // [BARU] Setoran Modal / Penarikan Modal
)

// Transaction adalah model untuk tabel 'transactions'
type Transaction struct {
	gorm.Model
	// [OPTIMASI 1] Tambahkan index pada UserID dan CreatedAt
	// Ini akan SANGAT mempercepat query dashboard (filter WHERE user_id AND created_at)
	UserID uint            `gorm:"not null;index"` // Milik user siapa
	Type   TransactionType `gorm:"not null;index"` // 'type' sudah di-index
	// [DIUBAH] decimal(10,2) -> decimal(20,2)
	TotalAmount float64 `gorm:"not null;type:decimal(20,2)"`
	Notes       string
	CreatedAt   time.Time `gorm:"index"` // [OPTIMASI 2] Tambahkan index pada CreatedAt

	// [BARU] Relasi ke Customer (Nullable)
	CustomerID *uint     `gorm:"index"`                 // Foreign key ke Customer (sudah di-index)
	Customer   *Customer `gorm:"foreignKey:CustomerID"` // Relasi GORM (nullable)

	// Relasi: Sebuah Transaksi memiliki banyak Item
	Items []TransactionItem `gorm:"foreignKey:TransactionID"`
	User  User              `gorm:"foreignKey:UserID"`
}

// TransactionItem adalah model untuk tabel 'transaction_items'
// Ini mencatat detail barang dalam satu transaksi
type TransactionItem struct {
	gorm.Model
	// [OPTIMASI 3] Tambahkan index pada TransactionID
	// Ini akan SANGAT mempercepat query JOIN dan subquery GROUP BY
	TransactionID uint   `gorm:"not null;index"`
	ProductID     *uint  `gorm:"index"`    // [OPTIMASI 4] Index di ProductID baik untuk laporan performa
	ProductName   string `gorm:"not null"` // Nama item (bisa produk / biaya lain)
	Quantity      int    `gorm:"not null"`
	// [DIUBAH] decimal(10,2) -> decimal(20,2)
	UnitPrice float64 `gorm:"not null;type:decimal(20,2)"` // Harga satuan (Harga Jual)
	// [DIUBAH] decimal(10,2) -> decimal(20,2)
	PurchasePrice float64 `gorm:"type:decimal(20,2);default:0"` // [BARU] Harga modal saat item ini terjual

	// Relasi
	Transaction Transaction
	Product     *Product // Relasi ke produk (nullable)
}
