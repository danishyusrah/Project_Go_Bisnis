package models

import (
	"gorm.io/gorm"
)

// TransactionType mendefinisikan tipe transaksi (Pemasukan/Pengeluaran)
type TransactionType string

const (
	Income  TransactionType = "INCOME"  // Pemasukan, misal: Penjualan
	Expense TransactionType = "EXPENSE" // Pengeluaran, misal: Beli bahan, Bayar Gaji
)

// Transaction adalah model untuk tabel 'transactions'
type Transaction struct {
	gorm.Model
	UserID      uint            `gorm:"not null"` // Milik user siapa
	Type        TransactionType `gorm:"not null;index"`
	TotalAmount float64         `gorm:"not null;type:decimal(10,2)"`
	Notes       string
	Customer    string // Nama pelanggan atau supplier (dibuat simpel)

	// Relasi: Sebuah Transaksi memiliki banyak Item
	Items []TransactionItem `gorm:"foreignKey:TransactionID"`
	User  User              `gorm:"foreignKey:UserID"`
}

// TransactionItem adalah model untuk tabel 'transaction_items'
// Ini mencatat detail barang dalam satu transaksi
type TransactionItem struct {
	gorm.Model
	TransactionID uint    `gorm:"not null"` // Foreign key ke Transaction
	ProductID     *uint   // Foreign key ke Product (nullable, *)
	ProductName   string  `gorm:"not null"` // Nama item (bisa produk / biaya lain)
	Quantity      int     `gorm:"not null"`
	UnitPrice     float64 `gorm:"not null;type:decimal(10,2)"` // Harga satuan

	// Relasi
	Transaction Transaction
	Product     *Product // Relasi ke produk (nullable)
}
