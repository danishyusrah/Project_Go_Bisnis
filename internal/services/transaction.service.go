package services

import (
	"errors"
	"fmt"

	"github.com/danishyusrah/go_bisnis/internal/database"
	"github.com/danishyusrah/go_bisnis/internal/dto"
	"github.com/danishyusrah/go_bisnis/internal/models"
	"gorm.io/gorm"
)

// TransactionService adalah struct untuk layanan terkait transaksi
type TransactionService struct{}

// NewTransactionService membuat instance TransactionService baru
func NewTransactionService() *TransactionService {
	return &TransactionService{}
}

// CreateTransaction adalah logika bisnis untuk membuat transaksi baru
// Ini adalah fungsi yang kompleks karena melibatkan database transaction
func (s *TransactionService) CreateTransaction(input dto.CreateTransactionInput, userID uint) (models.Transaction, error) {
	db := database.DB
	var totalAmount float64 = 0
	var transactionItems []models.TransactionItem

	// 1. Mulai Database Transaction
	// Ini adalah praktik profesional untuk memastikan integritas data (Atomicity)
	tx := db.Begin()
	if tx.Error != nil {
		return models.Transaction{}, errors.New("gagal memulai database transaction")
	}

	// 2. Iterasi setiap item dalam DTO
	for _, itemInput := range input.Items {
		totalAmount += itemInput.UnitPrice * float64(itemInput.Quantity)

		// 2a. Jika ini adalah Transaksi Pemasukan (Penjualan) DAN ada ProductID
		if input.Type == models.Income && itemInput.ProductID != nil {
			var product models.Product

			// Kunci record produk (FOR UPDATE) untuk mencegah race condition
			// Ini adalah fitur yang SANGAT profesional
			if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&product, *itemInput.ProductID).Error; err != nil {
				tx.Rollback() // Batalkan transaksi
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return models.Transaction{}, fmt.Errorf("produk ID %d tidak ditemukan", *itemInput.ProductID)
				}
				return models.Transaction{}, err
			}

			// Cek kepemilikan produk
			if product.UserID != userID {
				tx.Rollback()
				return models.Transaction{}, fmt.Errorf("akses ditolak: produk ID %d bukan milik Anda", *itemInput.ProductID)
			}

			// Cek stok
			if product.Stock < itemInput.Quantity {
				tx.Rollback()
				return models.Transaction{}, fmt.Errorf("stok tidak cukup untuk produk: %s (sisa: %d)", product.Name, product.Stock)
			}

			// Kurangi stok
			newStock := product.Stock - itemInput.Quantity
			if err := tx.Model(&product).Update("stock", newStock).Error; err != nil {
				tx.Rollback()
				return models.Transaction{}, fmt.Errorf("gagal memperbarui stok untuk produk ID %d", *itemInput.ProductID)
			}
		}

		// 2b. Buat struct TransactionItem
		newItem := models.TransactionItem{
			ProductID:   itemInput.ProductID,
			ProductName: itemInput.ProductName,
			Quantity:    itemInput.Quantity,
			UnitPrice:   itemInput.UnitPrice,
		}
		transactionItems = append(transactionItems, newItem)
	}

	// 3. Buat Transaksi Utama
	newTransaction := models.Transaction{
		UserID:      userID,
		Type:        input.Type,
		TotalAmount: totalAmount,
		Customer:    input.Customer,
		Notes:       input.Notes,
		Items:       transactionItems, // Asosiasikan item
	}

	// Simpan transaksi (dan GORM akan otomatis menyimpan item-item terkait)
	if err := tx.Create(&newTransaction).Error; err != nil {
		tx.Rollback()
		return models.Transaction{}, errors.New("gagal menyimpan data transaksi")
	}

	// 4. Commit Database Transaction
	// Jika semua langkah di atas berhasil, simpan perubahan secara permanen
	if err := tx.Commit().Error; err != nil {
		return models.Transaction{}, errors.New("gagal meng-commit database transaction")
	}

	return newTransaction, nil
}

// GetUserTransactions mengambil daftar transaksi milik user
func (s *TransactionService) GetUserTransactions(userID uint) ([]models.Transaction, error) {
	var transactions []models.Transaction
	db := database.DB

	// Mengambil transaksi DAN preloading (mengambil juga) Items terkait
	// Kita urutkan berdasarkan yang terbaru (ID descending)
	err := db.Preload("Items").Where("user_id = ?", userID).Order("id desc").Find(&transactions).Error
	if err != nil {
		return nil, errors.New("gagal mengambil data transaksi")
	}

	return transactions, nil
}

// GetTransactionByID mengambil detail satu transaksi (dan memvalidasi kepemilikan)
func (s *TransactionService) GetTransactionByID(transactionID uint, userID uint) (models.Transaction, error) {
	var transaction models.Transaction
	db := database.DB

	// Preload Items untuk mendapatkan detail transaksi
	err := db.Preload("Items").First(&transaction, transactionID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.Transaction{}, errors.New("transaksi tidak ditemukan")
		}
		return models.Transaction{}, err
	}

	// Validasi kepemilikan
	if transaction.UserID != userID {
		return models.Transaction{}, errors.New("akses ditolak: Anda bukan pemilik transaksi ini")
	}

	return transaction, nil
}
