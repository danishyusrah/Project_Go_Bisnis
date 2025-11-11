package services

import (
	"fmt" // [BARU] Impor fmt untuk format deskripsi
	"log"
	"time" // [BARU] Impor time

	"github.com/danishyusrah/go_bisnis/internal/database"
	"github.com/danishyusrah/go_bisnis/internal/dto"
	"github.com/danishyusrah/go_bisnis/internal/models"
	// [BARU] Impor gorm
)

// ReportService adalah struct untuk layanan terkait laporan
type ReportService struct{}

// NewReportService membuat instance ReportService baru
func NewReportService() *ReportService {
	return &ReportService{}
}

// GetProductPerformanceReport mengambil data performa produk berdasarkan rentang waktu
func (s *ReportService) GetProductPerformanceReport(userID uint, startTime time.Time, endTime time.Time) ([]dto.ProductPerformanceReport, error) {
	db := database.DB
	var results []dto.ProductPerformanceReport

	// Query ini akan:
	// 1. Mengambil dari tabel transaction_items
	// 2. Bergabung (JOIN) dengan tabel transactions untuk memfilter
	// 3. Memfilter berdasarkan:
	//    - user_id (pemilik)
	//    - transaction.type = 'INCOME' (hanya penjualan)
	//    - Rentang waktu (created_at)
	// 4. Mengelompokkan (GROUP BY) berdasarkan nama produk dan ID produk
	// 5. Menghitung (SUM) total kuantitas terjual dan total pendapatan
	// 6. Mengurutkan (ORDER BY) berdasarkan pendapatan tertinggi
	err := db.Model(&models.TransactionItem{}).
		Select("transaction_items.product_id, transaction_items.product_name, SUM(transaction_items.quantity) as total_sold, SUM(transaction_items.quantity * transaction_items.unit_price) as total_revenue").
		Joins("JOIN transactions ON transactions.id = transaction_items.transaction_id").
		Where("transactions.user_id = ? AND transactions.type = ? AND transactions.created_at BETWEEN ? AND ?", userID, models.Income, startTime, endTime).
		Group("transaction_items.product_name, transaction_items.product_id").
		Order("total_revenue desc").
		Scan(&results).Error

	if err != nil {
		log.Printf("Error querying product performance report: %v", err)
		return nil, err
	}

	return results, nil
}

// --- [BARU] FUNGSI UNTUK BUKU BESAR (GENERAL LEDGER) ---

// GetGeneralLedgerReport membuat laporan buku besar yang mirip buku kas manual
func (s *ReportService) GetGeneralLedgerReport(userID uint, startTime time.Time, endTime time.Time) (dto.GeneralLedgerReport, error) {
	db := database.DB
	var report dto.GeneralLedgerReport
	var transactions []models.Transaction

	// --- 1. Hitung Saldo Awal (Beginning Balance) ---
	// Saldo awal adalah total (Pemasukan + Modal - Pengeluaran) SEBELUM startTime
	type BalanceResult struct {
		Balance float64
	}
	var balanceResult BalanceResult

	// [PERUBAHAN DI SINI]
	// Kita ubah query CASE agar menyertakan CAPITAL sebagai kas masuk
	err := db.Model(&models.Transaction{}).
		Select("COALESCE(SUM(CASE WHEN type = ? THEN total_amount WHEN type = ? THEN total_amount WHEN type = ? THEN -total_amount ELSE 0 END), 0) as balance",
			models.Income, models.Capital, models.Expense).
		Where("user_id = ? AND created_at < ?", userID, startTime).
		Scan(&balanceResult).Error

	if err != nil {
		log.Printf("Error calculating beginning balance: %v", err)
		return report, err
	}
	report.BeginningBalance = balanceResult.Balance

	// --- 2. Ambil Semua Transaksi DALAM Rentang Waktu ---
	// Query ini sudah benar, karena kita ambil SEMUA tipe
	err = db.Preload("Items").
		Where("user_id = ? AND created_at BETWEEN ? AND ?", userID, startTime, endTime).
		Order("created_at asc, id asc"). // Urutkan berdasarkan tanggal, lalu ID
		Find(&transactions).Error

	if err != nil {
		log.Printf("Error fetching transactions for ledger: %v", err)
		return report, err
	}

	// --- 3. Proses Entri dan Hitung Saldo Berjalan (Running Balance) ---
	runningBalance := report.BeginningBalance
	var totalDebit float64 = 0
	var totalCredit float64 = 0

	var entries []dto.LedgerEntry
	for _, tx := range transactions {
		var entry dto.LedgerEntry
		entry.Date = tx.CreatedAt.Format("02 Jan 2006 15:04") // Format tanggal

		// [PERUBAHAN DI SINI] Buat deskripsi yang bagus
		if tx.Type == models.Capital {
			entry.Description = "Setoran Modal" // Deskripsi default untuk modal
		} else if len(tx.Items) > 0 {
			// Ambil nama item pertama sebagai deskripsi utama
			entry.Description = tx.Items[0].ProductName
			if len(tx.Items) > 1 {
				entry.Description = fmt.Sprintf("%s (dan %d item lainnya)", entry.Description, len(tx.Items)-1)
			}
		} else {
			// Fallback jika tidak ada item
			entry.Description = "Transaksi " + string(tx.Type)
		}
		// Tambahkan catatan jika ada
		if tx.Notes != "" {
			entry.Description = fmt.Sprintf("%s - %s", entry.Description, tx.Notes)
		}

		// [PERUBAHAN DI SINI] Tentukan Debet (Keluar) atau Kredit (Masuk)
		if tx.Type == models.Income || tx.Type == models.Capital {
			entry.Credit = tx.TotalAmount
			entry.Debit = 0
			runningBalance += tx.TotalAmount
			totalCredit += tx.TotalAmount
		} else if tx.Type == models.Expense {
			entry.Credit = 0
			entry.Debit = tx.TotalAmount
			runningBalance -= tx.TotalAmount
			totalDebit += tx.TotalAmount
		} else {
			continue // Abaikan tipe lain (jika ada)
		}

		entry.Balance = runningBalance // Catat saldo berjalan
		entries = append(entries, entry)
	}

	// --- 4. Selesaikan Laporan ---
	report.Entries = entries
	report.TotalDebit = totalDebit
	report.TotalCredit = totalCredit
	report.EndingBalance = runningBalance // Saldo akhir adalah saldo berjalan terakhir

	return report, nil
}

// --- [BARU] FUNGSI UNTUK LAPORAN UTANG & PIUTANG ---

// GetUnpaidReport membuat laporan transaksi yang belum lunas
func (s *ReportService) GetUnpaidReport(userID uint) (dto.UnpaidReport, error) {
	db := database.DB
	var report dto.UnpaidReport
	report.Receivables = []dto.UnpaidTransactionItem{}
	report.Payables = []dto.UnpaidTransactionItem{}

	now := time.Now()
	// Tentukan awal hari ini untuk perbandingan "IsOverdue"
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	// 1. Ambil Piutang (Receivables)
	var unpaidIncomes []models.Transaction
	err := db.Preload("Customer").Preload("Items").
		Where("user_id = ? AND type = ? AND payment_status = ?", userID, models.Income, models.BelumLunas).
		Order("created_at asc").Find(&unpaidIncomes).Error
	if err != nil {
		log.Printf("Error fetching unpaid incomes: %v", err)
		return report, err
	}

	// 2. Proses Piutang
	for _, tx := range unpaidIncomes {
		report.TotalReceivable += tx.TotalAmount

		customerName := "Umum"
		if tx.Customer != nil {
			customerName = tx.Customer.Name
		}

		primaryItem := "Penjualan"
		if len(tx.Items) > 0 {
			primaryItem = tx.Items[0].ProductName
		}

		var dueDateStr *string
		isOverdue := false
		if tx.DueDate != nil {
			formatted := tx.DueDate.Format("2006-01-02")
			dueDateStr = &formatted
			isOverdue = tx.DueDate.Before(today) // Cek apakah sudah lewat hari ini
		}

		item := dto.UnpaidTransactionItem{
			TransactionID: tx.ID,
			CustomerName:  customerName,
			Amount:        tx.TotalAmount,
			CreatedAt:     tx.CreatedAt.Format("02 Jan 2006"),
			DueDate:       dueDateStr,
			IsOverdue:     isOverdue,
			PrimaryItem:   primaryItem,
		}
		report.Receivables = append(report.Receivables, item)
	}

	// 3. Ambil Utang (Payables)
	var unpaidExpenses []models.Transaction
	err = db.Preload("Customer").Preload("Items").
		Where("user_id = ? AND type = ? AND payment_status = ?", userID, models.Expense, models.BelumLunas).
		Order("created_at asc").Find(&unpaidExpenses).Error
	if err != nil {
		log.Printf("Error fetching unpaid expenses: %v", err)
		return report, err
	}

	// 4. Proses Utang
	for _, tx := range unpaidExpenses {
		report.TotalPayable += tx.TotalAmount

		customerName := "Umum" // Di sini berarti "Supplier"
		if tx.Customer != nil {
			customerName = tx.Customer.Name
		}

		primaryItem := "Biaya Operasional"
		if len(tx.Items) > 0 {
			primaryItem = tx.Items[0].ProductName
		}

		var dueDateStr *string
		isOverdue := false
		if tx.DueDate != nil {
			formatted := tx.DueDate.Format("2006-01-02")
			dueDateStr = &formatted
			isOverdue = tx.DueDate.Before(today)
		}

		item := dto.UnpaidTransactionItem{
			TransactionID: tx.ID,
			CustomerName:  customerName,
			Amount:        tx.TotalAmount,
			CreatedAt:     tx.CreatedAt.Format("02 Jan 2006"),
			DueDate:       dueDateStr,
			IsOverdue:     isOverdue,
			PrimaryItem:   primaryItem,
		}
		report.Payables = append(report.Payables, item)
	}

	return report, nil
}
