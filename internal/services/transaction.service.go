package services

import (
	"errors"
	"fmt"
	"log"
	"time" // [BARU] Pastikan 'time' di-import

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

	// --- [BARU] Validasi Pelanggan untuk Utang/Piutang ---
	// Jika status "BELUM LUNAS", CustomerID wajib diisi
	if input.PaymentStatus == models.BelumLunas && input.CustomerID == nil {
		tx.Rollback()
		return models.Transaction{}, errors.New("pelanggan/supplier wajib diisi untuk transaksi yang belum lunas")
	}
	// --- [AKHIR BARU] ---

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

	// --- [BARU] Validasi Kategori ---
	if input.CategoryID != nil {
		var category models.Category
		if err := tx.First(&category, *input.CategoryID).Error; err != nil {
			tx.Rollback()
			return models.Transaction{}, errors.New("kategori tidak ditemukan")
		}
		if category.UserID != userID {
			tx.Rollback()
			return models.Transaction{}, errors.New("akses kategori ditolak")
		}
		// Pastikan tipe kategori cocok (INCOME ke INCOME, EXPENSE ke EXPENSE)
		if (input.Type == models.Income && category.Type != models.IncomeCategory) || (input.Type == models.Expense && category.Type != models.ExpenseCategory) {
			tx.Rollback()
			return models.Transaction{}, fmt.Errorf("tipe kategori '%s' tidak cocok untuk transaksi '%s'", category.Type, input.Type)
		}
	}
	// --- [AKHIR BARU] ---

	// --- [BARU] Konversi Tanggal Jatuh Tempo ---
	var dueDate *time.Time
	if input.DueDate != nil && *input.DueDate != "" {
		parsedDate, err := time.Parse("2006-01-02", *input.DueDate)
		if err != nil {
			tx.Rollback()
			return models.Transaction{}, errors.New("format tanggal jatuh tempo tidak valid, gunakan YYYY-MM-DD")
		}
		dueDate = &parsedDate
	}
	// --- [AKHIR BARU] ---

	// --- Logika Baru Berdasarkan Tipe Transaksi ---

	if input.Type == models.Capital {
		// --- LOGIKA UNTUK MODAL (CAPITAL) ---

		if len(input.Items) > 0 {
			tx.Rollback()
			return models.Transaction{}, errors.New("transaksi 'Modal' tidak boleh memiliki item")
		}
		if input.TotalAmount <= 0 {
			tx.Rollback()
			return models.Transaction{}, errors.New("transaksi 'Modal' harus memiliki total_amount > 0")
		}

		totalAmount = input.TotalAmount

	} else if input.Type == models.Income || input.Type == models.Expense {
		// --- LOGIKA UNTUK PEMASUKAN (INCOME) & PENGELUARAN (EXPENSE) ---

		if len(input.Items) == 0 {
			tx.Rollback()
			return models.Transaction{}, errors.New("transaksi 'Pemasukan' atau 'Pengeluaran' harus memiliki minimal 1 item")
		}

		for _, itemInput := range input.Items {
			totalAmount += itemInput.UnitPrice * float64(itemInput.Quantity)
			var itemPurchasePrice float64 = 0

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

				if input.Type == models.Income {
					if product.Stock < itemInput.Quantity {
						tx.Rollback()
						return models.Transaction{}, fmt.Errorf("stok tidak cukup untuk produk: %s (sisa: %d)", product.Name, product.Stock)
					}
					itemPurchasePrice = product.PurchasePrice
					newStock := product.Stock - itemInput.Quantity
					if err := tx.Model(&product).Update("stock", newStock).Error; err != nil {
						tx.Rollback()
						return models.Transaction{}, fmt.Errorf("gagal memperbarui stok untuk produk ID %d", *itemInput.ProductID)
					}
				}
				if input.Type == models.Expense {
					newStock := product.Stock + itemInput.Quantity
					if err := tx.Model(&product).Update("stock", newStock).Error; err != nil {
						tx.Rollback()
						return models.Transaction{}, fmt.Errorf("gagal memperbarui stok (restock) untuk produk ID %d", *itemInput.ProductID)
					}
				}
			}

			newItem := models.TransactionItem{
				ProductID:     itemInput.ProductID,
				ProductName:   itemInput.ProductName,
				Quantity:      itemInput.Quantity,
				UnitPrice:     itemInput.UnitPrice,
				PurchasePrice: itemPurchasePrice,
			}
			transactionItems = append(transactionItems, newItem)
		}

	} else {
		tx.Rollback()
		return models.Transaction{}, errors.New("tipe transaksi tidak valid")
	}

	// --- Pembuatan Transaksi (Berlaku untuk semua tipe) ---

	// [BARU] Tentukan Status Pembayaran
	paymentStatus := input.PaymentStatus
	if paymentStatus == "" {
		paymentStatus = models.Lunas // Default
	}
	// Jika Modal, paksa LUNAS
	if input.Type == models.Capital {
		paymentStatus = models.Lunas
		dueDate = nil
	}

	newTransaction := models.Transaction{
		UserID:      userID,
		Type:        input.Type,
		TotalAmount: totalAmount,
		CustomerID:  input.CustomerID,
		Notes:       input.Notes,
		Items:       transactionItems,
		// [BARU] Simpan data baru
		PaymentStatus: paymentStatus,
		DueDate:       dueDate,
		CategoryID:    input.CategoryID, // [BARU]
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

	// [DIUBAH] Selalu Preload Items, Customer, dan Category
	query := db.Preload("Items").Preload("Customer").Preload("Category").Where("transactions.user_id = ?", userID)

	if searchQuery != "" {
		searchTerm := "%" + searchQuery + "%"
		log.Printf("Mencari transaksi untuk user %d dengan query: %s", userID, searchQuery)

		query = query.Joins("LEFT JOIN transaction_items ON transaction_items.transaction_id = transactions.id").
			Joins("LEFT JOIN customers ON customers.id = transactions.customer_id").
			Where("transaction_items.product_name LIKE ? OR customers.name LIKE ? OR transactions.notes LIKE ?", searchTerm, searchTerm, searchTerm).
			Group("transactions.id")
	}

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

	// [DIUBAH] Preload Items, Customer, dan Category
	err := db.Preload("Items").Preload("Customer").Preload("Category").First(&transaction, transactionID).Error
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

// --- [BARU] FUNGSI UNTUK MELUNASI UTANG/PIUTANG ---

// MarkTransactionPaid menandai transaksi sebagai LUNAS
func (s *TransactionService) MarkTransactionPaid(transactionID uint, userID uint) error {
	db := database.DB

	// 1. Ambil transaksi dan validasi kepemilikan
	// Kita gunakan GetTransactionByID karena sudah memiliki logika validasi
	tx, err := s.GetTransactionByID(transactionID, userID)
	if err != nil {
		return err // Mengembalikan error (cth: "transaksi tidak ditemukan" atau "akses ditolak")
	}

	// 2. Cek apakah sudah lunas
	if tx.PaymentStatus == models.Lunas {
		return errors.New("transaksi ini sudah lunas")
	}

	// 3. Update status menjadi LUNAS
	// Kita gunakan Update() untuk mengubah satu kolom
	if err := db.Model(&tx).Update("payment_status", models.Lunas).Error; err != nil {
		log.Printf("Error updating payment status for tx %d: %v", transactionID, err)
		return errors.New("gagal memperbarui status pembayaran")
	}

	return nil
}
