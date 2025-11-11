package handlers

import (
	"net/http"
	"strconv"

	// [BARU] Pastikan 'time' di-import
	"github.com/danishyusrah/go_bisnis/internal/dto"
	"github.com/danishyusrah/go_bisnis/internal/models"
	"github.com/danishyusrah/go_bisnis/internal/services"
	"github.com/gin-gonic/gin"
)

// TransactionHandler menghandle request terkait transaksi
type TransactionHandler struct {
	Service *services.TransactionService
}

// NewTransactionHandler membuat handler transaksi baru
func NewTransactionHandler() *TransactionHandler {
	return &TransactionHandler{
		Service: services.NewTransactionService(),
	}
}

// helper untuk mengubah model transaksi menjadi DTO respons
func toTransactionResponse(tx models.Transaction) dto.TransactionResponse {
	items := []dto.TransactionItemResponse{}
	for _, item := range tx.Items {
		items = append(items, dto.TransactionItemResponse{
			ID:          item.ID,
			ProductID:   item.ProductID,
			ProductName: item.ProductName,
			Quantity:    item.Quantity,
			UnitPrice:   item.UnitPrice,
		})
	}

	// [DIUBAH] Logika untuk mengisi data pelanggan
	var customerID *uint
	var customerName string
	if tx.Customer != nil {
		customerID = &tx.Customer.ID
		customerName = tx.Customer.Name
	} else {
		// Jika tidak ada pelanggan terkait (misal: pengeluaran atau data lama)
		customerName = "Umum" // Default
	}

	// --- [BARU] Logika untuk mengisi data Jatuh Tempo ---
	var dueDateStr *string
	if tx.DueDate != nil {
		formatted := tx.DueDate.Format("2006-01-02") // Format YYYY-MM-DD
		dueDateStr = &formatted
	}
	// --- [AKHIR BARU] ---

	// --- [BARU] Logika untuk mengisi data Kategori ---
	var categoryID *uint
	var categoryName string
	if tx.Category != nil {
		categoryID = &tx.Category.ID
		categoryName = tx.Category.Name
	}
	// --- [AKHIR BARU] ---

	return dto.TransactionResponse{
		ID:           tx.ID,
		Type:         tx.Type,
		TotalAmount:  tx.TotalAmount,
		Notes:        tx.Notes,
		CreatedAt:    tx.CreatedAt.Format("2006-01-02 15:04:05"),
		Items:        items,
		CustomerID:   customerID,
		CustomerName: customerName,

		// [BARU DARI FITUR SEBELUMNYA]
		PaymentStatus: tx.PaymentStatus,
		DueDate:       dueDateStr,

		// --- [BARU UNTUK FITUR KATEGORI] ---
		CategoryID:   categoryID,
		CategoryName: categoryName,
		// --- [AKHIR BARU] ---
	}
}

// CreateTransaction menangani pembuatan transaksi baru
func (h *TransactionHandler) CreateTransaction(c *gin.Context) {
	var input dto.CreateTransactionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, ok := getUserIDFromContext(c) // Menggunakan helper dari product.handler.go
	if !ok {
		return
	}

	transaction, err := h.Service.CreateTransaction(input, userID)
	if err != nil {
		// Error yang lebih spesifik dari service
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	// Memuat ulang data dengan item, CUSTOMER, dan CATEGORY untuk respons yang lengkap
	txWithDetails, err := h.Service.GetTransactionByID(transaction.ID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data transaksi setelah dibuat"})
		return
	}

	c.JSON(http.StatusCreated, toTransactionResponse(txWithDetails))
}

// GetUserTransactions menangani pengambilan semua transaksi user
func (h *TransactionHandler) GetUserTransactions(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	// [BARU] Ambil query parameter "search" dari URL
	// Cth: /api/v1/transactions?search=kopi
	searchQuery := c.Query("search")

	// [DIPERBARUI] Kirim searchQuery ke service
	transactions, err := h.Service.GetUserTransactions(userID, searchQuery)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data transaksi"})
		return
	}

	// Ubah list model ke list DTO
	var responses []dto.TransactionResponse
	for _, tx := range transactions {
		responses = append(responses, toTransactionResponse(tx))
	}

	c.JSON(http.StatusOK, responses)
}

// GetTransactionByID menangani pengambilan satu transaksi
func (h *TransactionHandler) GetTransactionByID(c *gin.Context) {
	txID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID transaksi tidak valid"})
		return
	}

	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	transaction, err := h.Service.GetTransactionByID(uint(txID), userID)
	if err != nil {
		if err.Error() == "transaksi tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if err.Error() == "akses ditolak: Anda bukan pemilik transaksi ini" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data transaksi"})
		return
	}

	c.JSON(http.StatusOK, toTransactionResponse(transaction))
}

// --- [BARU] FUNGSI UNTUK MELUNASI UTANG/PIUTANG ---

// MarkTransactionPaid menangani permintaan untuk menandai transaksi sebagai LUNAS
func (h *TransactionHandler) MarkTransactionPaid(c *gin.Context) {
	// 1. Ambil ID Transaksi dari URL
	txID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID transaksi tidak valid"})
		return
	}

	// 2. Ambil UserID dari context
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	// 3. Panggil service
	err = h.Service.MarkTransactionPaid(uint(txID), userID)
	if err != nil {
		// Tangani error spesifik dari service
		if err.Error() == "transaksi tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if err.Error() == "akses ditolak: Anda bukan pemilik transaksi ini" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		if err.Error() == "transaksi ini sudah lunas" {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()}) // 409 Conflict
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui status transaksi"})
		return
	}

	// 4. Kirim respons sukses
	c.JSON(http.StatusOK, gin.H{"message": "Transaksi berhasil ditandai sebagai lunas"})
}
