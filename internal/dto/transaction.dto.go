package dto

import (
	"github.com/danishyusrah/go_bisnis/internal/models"
)

// CreateTransactionItemInput adalah DTO untuk satu item dalam transaksi
type CreateTransactionItemInput struct {
	ProductID   *uint   `json:"product_id"` // ID Produk (nullable, jika ini item non-produk)
	ProductName string  `json:"product_name" binding:"required"`
	Quantity    int     `json:"quantity" binding:"required,gt=0"`
	UnitPrice   float64 `json:"unit_price" binding:"required,gte=0"`
}

// CreateTransactionInput adalah DTO untuk membuat transaksi baru
type CreateTransactionInput struct {
	Type  models.TransactionType `json:"type" binding:"required"` // "INCOME", "EXPENSE", atau "CAPITAL"
	Notes string                 `json:"notes"`
	// [PERUBAHAN] Items sekarang opsional (omitempty), tapi jika ada, minimal 1 (min=1)
	// 'dive' berarti validasi akan dijalankan pada setiap item di dalam array
	Items      []CreateTransactionItemInput `json:"items" binding:"omitempty,min=1,dive"`
	CustomerID *uint                        `json:"customer_id"`
	// [BARU] TotalAmount adalah untuk transaksi non-item (seperti Modal)
	// Ini juga opsional, dan hanya akan digunakan jika tipenya 'CAPITAL'
	TotalAmount float64 `json:"total_amount" binding:"omitempty,gte=0"`

	// [BARU UNTUK FITUR UTANG/PIUTANG]
	// Kita gunakan 'omitempty' agar jika tidak dikirim, nilai default (LUNAS) akan dipakai
	PaymentStatus models.PaymentStatusType `json:"payment_status" binding:"omitempty,oneof=LUNAS 'BELUM LUNAS' ''"`
	// Kita terima sebagai string pointer, format YYYY-MM-DD
	DueDate *string `json:"due_date" binding:"omitempty,datetime=2006-01-02"`

	// --- [BARU UNTUK FITUR KATEGORI] ---
	CategoryID *uint `json:"category_id"` // Opsional, hanya untuk Pemasukan/Pengeluaran
	// --- [AKHIR BARU] ---
}

// TransactionItemResponse adalah DTO untuk detail item dalam respons
type TransactionItemResponse struct {
	ID          uint    `json:"id"`
	ProductID   *uint   `json:"product_id"`
	ProductName string  `json:"product_name"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
}

// TransactionResponse adalah DTO untuk data transaksi lengkap
type TransactionResponse struct {
	ID          uint                      `json:"id"`
	Type        models.TransactionType    `json:"type"`
	TotalAmount float64                   `json:"total_amount"`
	Notes       string                    `json:"notes"`
	CreatedAt   string                    `json:"created_at"`
	Items       []TransactionItemResponse `json:"items"`

	// Informasi pelanggan yang terstruktur
	CustomerID   *uint  `json:"customer_id"`
	CustomerName string `json:"customer_name"` // Kita akan isi nama pelanggan di sini

	// [BARU UNTUK FITUR UTANG/PIUTANG]
	PaymentStatus models.PaymentStatusType `json:"payment_status"`
	DueDate       *string                  `json:"due_date"` // Akan dikirim sebagai string "YYYY-MM-DD" atau null

	// --- [BARU UNTUK FITUR KATEGORI] ---
	CategoryID   *uint  `json:"category_id"`
	CategoryName string `json:"category_name"` // Kita akan isi nama kategori di sini
	// --- [AKHIR BARU] ---
}
