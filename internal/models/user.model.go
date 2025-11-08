package models

import (
	"gorm.io/gorm"
)

// User adalah model untuk tabel 'users'
// Ini adalah model dasar yang profesional dengan gorm.Model
// (termasuk ID, CreatedAt, UpdatedAt, DeletedAt)
type User struct {
	gorm.Model
	Username     string `gorm:"uniqueIndex;not null;size:100"`
	Email        string `gorm:"uniqueIndex;not null;size:255"`
	PasswordHash string `gorm:"not null"`
	FullName     string `gorm:"size:255"`

	// Relasi: Seorang User 'has many' Products
	Products []Product `gorm:"foreignKey:UserID"` // <-- BARU
}
