package models

import (
	"gorm.io/gorm"
)

// Customer adalah model untuk tabel 'customers'
// Ini akan menyimpan data pelanggan Anda secara terstruktur
type Customer struct {
	gorm.Model
	Name    string `gorm:"not null;size:255"`
	Email   string `gorm:"size:255"` // Opsional
	Phone   string `gorm:"size:50"`  // Opsional
	Address string // Opsional

	// Relasi: Setiap pelanggan dimiliki oleh satu User
	UserID uint `gorm:"not null"` // Foreign Key ke tabel users
	User   User // GORM akan otomatis mengelola relasi ini

	// Relasi: Seorang Customer 'has many' Transactions
	Transactions []Transaction `gorm:"foreignKey:CustomerID"` // <-- Relasi baru
}
