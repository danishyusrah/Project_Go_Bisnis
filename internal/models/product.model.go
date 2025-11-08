package models

import (
	"gorm.io/gorm"
)

// Product adalah model untuk tabel 'products'
type Product struct {
	gorm.Model
	Name          string `gorm:"not null;size:255"`
	SKU           string `gorm:"uniqueIndex;size:100"` // Kode unik produk
	Description   string
	PurchasePrice float64 `gorm:"type:decimal(10,2)"` // Harga Beli
	SellingPrice  float64 `gorm:"type:decimal(10,2)"` // Harga Jual
	Stock         int     `gorm:"default:0"`

	// Relasi: Setiap produk dimiliki oleh satu User
	UserID uint `gorm:"not null"` // Foreign Key ke tabel users
	User   User // GORM akan otomatis mengelola relasi ini
}
