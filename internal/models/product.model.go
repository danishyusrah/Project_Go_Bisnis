package models

import (
	"gorm.io/gorm"
)

// Product adalah model untuk tabel 'products'
type Product struct {
	gorm.Model
	Name        string `gorm:"not null;size:255"`
	SKU         string `gorm:"uniqueIndex;size:100"` // Kode unik produk
	Description string
	// [DIUBAH] decimal(10,2) -> decimal(20,2)
	PurchasePrice float64 `gorm:"type:decimal(20,2)"` // Harga Beli
	// [DIUBAH] decimal(10,2) -> decimal(20,2)
	SellingPrice float64 `gorm:"type:decimal(20,2)"` // Harga Jual
	Stock        int     `gorm:"default:0"`

	// --- [BARU UNTUK FITUR STOK MINIMUM] ---
	BatasStokMinimum int `gorm:"default:0"` // Batas stok untuk peringatan
	// --- [AKHIR BARU] ---

	// Relasi: Setiap produk dimiliki oleh satu User
	UserID uint `gorm:"not null"` // Foreign Key ke tabel users
	User   User // GORM akan otomatis mengelola relasi ini
}
