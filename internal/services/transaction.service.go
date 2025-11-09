package services

import (
	"errors"
	"fmt"
	"log"

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
// [DIUBAH] Logika dirombak untuk menangani 'CAPITAL'
func (s *TransactionService) CreateTransaction(input dto.CreateTransactionInput, userID uint) (models.Transaction, error) {
	db := database.DB
	var totalAmount float64 = 0
	var transactionItems []models.TransactionItem

	tx := db.Begin()
	if tx.Error != nil {
		return models.Transaction{}, errors.New("gagal memulai database transaction")
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Validasi CustomerID jika ada (Berlaku untuk semua tipe)
	if input.CustomerID != nil {
		var customer models.Customer
		if err := tx.First(&customer, *input.CustomerID).Error; err != nil {
			tx.Rollback()
			return models.Transaction{}, errors.New("pelanggan tidak ditemukan")
		}
		if customer.UserID != userID {
			tx.Rollback()
			return models.Transaction{}, errors.New("akses pelanggan ditolak")
		}
	}

	// --- Logika Baru Berdasarkan Tipe Transaksi ---

	if input.Type == models.Capital {
		// --- LOGIKA UNTUK MODAL (CAPITAL) ---

		// 1. Validasi: Modal tidak boleh punya item
		if len(input.Items) > 0 {
			tx.Rollback()
			return models.Transaction{}, errors.New("transaksi 'Modal' tidak boleh memiliki item")
		}
		// 2. Validasi: Modal harus punya TotalAmount
		if input.TotalAmount <= 0 {
			tx.Rollback()
			return models.Transaction{}, errors.New("transaksi 'Modal' harus memiliki total_amount > 0")
		}

		// 3. Set TotalAmount langsung dari input
		totalAmount = input.TotalAmount
		// transactionItems tetap kosong (slice nil)

	} else if input.Type == models.Income || input.Type == models.Expense {
		// --- LOGIKA UNTUK PEMASUKAN (INCOME) & PENGELUARAN (EXPENSE) ---

		// 1. Validasi: Tipe ini WAJIB punya item
		if len(input.Items) == 0 {
			tx.Rollback()
			return models.Transaction{}, errors.New("transaksi 'Pemasukan' atau 'Pengeluaran' harus memiliki minimal 1 item")
		}

		// 2. Proses setiap item (Logika lama Anda sudah benar)
		for _, itemInput := range input.Items {
			totalAmount += itemInput.UnitPrice * float64(itemInput.Quantity)
			var itemPurchasePrice float64 = 0

			// Logika Stok (Hanya jika ProductID ada)
			if itemInput.ProductID != nil {
				var product models.Product
				if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&product, *itemInput.ProductID).Error; err != nil {
					tx.Rollback()
					if errors.Is(err, gorm.ErrRecordNotFound) {
						return models.Transaction{}, fmt.Errorf("produk ID %d tidak ditemukan", *itemInput.ProductID)
					}
					return models.Transaction{}, err
				}

				if product.UserID != userID {
					tx.Rollback()
					return models.Transaction{}, fmt.Errorf("akses ditolak: produk ID %d bukan milik Anda", *itemInput.ProductID)
				}

				// Logika PENGURANGAN STOK (Penjualan)
				if input.Type == models.Income {
					if product.Stock < itemInput.Quantity {
						tx.Rollback()
						return models.Transaction{}, fmt.Errorf("stok tidak cukup untuk produk: %s (sisa: %d)", product.Name, product.Stock)
					}
					itemPurchasePrice = product.PurchasePrice // Ambil harga modal
					newStock := product.Stock - itemInput.Quantity
					if err := tx.Model(&product).Update("stock", newStock).Error; err != nil {
						tx.Rollback()
						return models.Transaction{}, fmt.Errorf("gagal memperbarui stok untuk produk ID %d", *itemInput.ProductID)
					}
				}
				// Logika PENAMBAHAN STOK (Restock)
				if input.Type == models.Expense {
					newStock := product.Stock + itemInput.Quantity
					if err := tx.Model(&product).Update("stock", newStock).Error; err != nil {
						tx.Rollback()
						return models.Transaction{}, fmt.Errorf("gagal memperbarui stok (restock) untuk produk ID %d", *itemInput.ProductID)
					}
				}
			}

			// Buat item transaksi
			newItem := models.TransactionItem{
				ProductID:     itemInput.ProductID,
				ProductName:   itemInput.ProductName,
				Quantity:      itemInput.Quantity,
				UnitPrice:     itemInput.UnitPrice,
				PurchasePrice: itemPurchasePrice, // Simpan harga modal
			}
			transactionItems = append(transactionItems, newItem)
		}

	} else {
		// --- Tipe tidak valid ---
		tx.Rollback()
		return models.Transaction{}, errors.New("tipe transaksi tidak valid")
	}

	// --- Pembuatan Transaksi (Berlaku untuk semua tipe) ---
	newTransaction := models.Transaction{
		UserID:      userID,
		Type:        input.Type,
		TotalAmount: totalAmount, // Sudah diisi oleh logika di atas
		CustomerID:  input.CustomerID,
		Notes:       input.Notes,
		Items:       transactionItems, // Akan kosong jika tipenya 'CAPITAL'
	}

	if err := tx.Create(&newTransaction).Error; err != nil {
		tx.Rollback()
		return models.Transaction{}, errors.New("gagal menyimpan data transaksi")
	}

	if err := tx.Commit().Error; err != nil {
		return models.Transaction{}, errors.New("gagal meng-commit database transaction")
	}

	return newTransaction, nil
}

// GetUserTransactions mengambil daftar transaksi milik user
func (s *TransactionService) GetUserTransactions(userID uint, searchQuery string) ([]models.Transaction, error) {
	var transactions []models.Transaction
	db := database.DB

	// Query dasar, selalu preload Items dan Customer
	query := db.Preload("Items").Preload("Customer").Where("transactions.user_id = ?", userID)

	// Logika pencarian
	if searchQuery != "" {
		searchTerm := "%" + searchQuery + "%"
		log.Printf("Mencari transaksi untuk user %d dengan query: %s", userID, searchQuery)

		query = query.Joins("LEFT JOIN transaction_items ON transaction_items.transaction_id = transactions.id").
			Joins("LEFT JOIN customers ON customers.id = transactions.customer_id").
			Where("transaction_items.product_name LIKE ? OR customers.name LIKE ? OR transactions.notes LIKE ?", searchTerm, searchTerm, searchTerm).
			Group("transactions.id")
	}

	// Selalu urutkan berdasarkan yang terbaru (ID descending)
	err := query.Order("transactions.id desc").Find(&transactions).Error
	if err != nil {
		return nil, errors.New("gagal mengambil data transaksi")
	}

	return transactions, nil
}

// GetTransactionByID mengambil detail satu transaksi (dan memvalidasi kepemilikan)
func (s *TransactionService) GetTransactionByID(transactionID uint, userID uint) (models.Transaction, error) {
	var transaction models.Transaction
	db := database.DB

	// Preload Items dan Customer untuk mendapatkan detail transaksi
	err := db.Preload("Items").Preload("Customer").First(&transaction, transactionID).Error
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
