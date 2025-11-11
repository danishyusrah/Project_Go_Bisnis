package models

import (
	"gorm.io/gorm"
)

// CategoryType mendefinisikan tipe kategori (Pemasukan atau Pengeluaran)
type CategoryType string

const (
	IncomeCategory  CategoryType = "INCOME"
	ExpenseCategory CategoryType = "EXPENSE"
)

// Category adalah model untuk tabel 'categories'
type Category struct {
	gorm.Model
	Name   string       `gorm:"not null;size:255"`
	Type   CategoryType `gorm:"not null;index"` // "INCOME" atau "EXPENSE"
	UserID uint         `gorm:"not null;index"` // Milik user siapa

	// Relasi
	User         User
	Transactions []Transaction `gorm:"foreignKey:CategoryID"` // Satu Kategori bisa dipakai banyak transaksi
}
