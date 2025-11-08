package dto

import "github.com/danishyusrah/go_bisnis/internal/models"

// CreateTransactionItemInput adalah DTO untuk satu item dalam transaksi
type CreateTransactionItemInput struct {
	ProductID   *uint   `json:"product_id"` // ID Produk (nullable, jika ini item non-produk)
	ProductName string  `json:"product_name" binding:"required"`
	Quantity    int     `json:"quantity" binding:"required,gt=0"`
	UnitPrice   float64 `json:"unit_price" binding:"required,gte=0"`
}

// CreateTransactionInput adalah DTO untuk membuat transaksi baru
type CreateTransactionInput struct {
	Type     models.TransactionType       `json:"type" binding:"required"` // "INCOME" atau "EXPENSE"
	Customer string                       `json:"customer"`
	Notes    string                       `json:"notes"`
	Items    []CreateTransactionItemInput `json:"items" binding:"required,min=1"` // Harus ada minimal 1 item
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
	Customer    string                    `json:"customer"`
	Notes       string                    `json:"notes"`
	CreatedAt   string                    `json:"created_at"`
	Items       []TransactionItemResponse `json:"items"`
}
