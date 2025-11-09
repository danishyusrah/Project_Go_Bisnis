package database

import (
	"fmt"
	"log"

	"github.com/danishyusrah/go_bisnis/config"
	"github.com/danishyusrah/go_bisnis/internal/models"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// DB adalah instance database GORM global
var DB *gorm.DB

// InitDatabase menginisialisasi koneksi ke database
func InitDatabase(cfg config.Config) {
	var err error

	// Membuat Data Source Name (DSN)
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBName,
	)

	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Gagal terhubung ke database: %v", err)
	}

	log.Println("Koneksi database berhasil.")

	// Auto-migrate (membuat tabel secara otomatis berdasarkan struct)
	// Ini adalah bagian dari "profesional" - mengelola skema DB
	MigrateDatabase()
}

// MigrateDatabase menjalankan auto-migration
func MigrateDatabase() {
	log.Println("Menjalankan migrasi database...")
	// Tambahkan semua model Anda di sini
	err := DB.AutoMigrate(
		&models.User{},
		&models.Product{},
		&models.Transaction{},     // <-- BARU: Tambahkan model Transaction
		&models.TransactionItem{}, // <-- BARU: Tambahkan model TransactionItem
		&models.Customer{},        // <-- BARU: Tambahkan model Customer
	)
	if err != nil {
		log.Fatalf("Gagal menjalankan migrasi: %v", err)
	}
	log.Println("Migrasi database selesai.")
}
