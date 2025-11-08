package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config menampung semua konfigurasi aplikasi
type Config struct {
	ServerPort string
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	JWTSecret  string // <-- BARU: Kunci rahasia untuk JWT
}

// AppConfig adalah variabel global untuk menampung konfigurasi yang sudah di-load
var AppConfig Config

// LoadConfig memuat konfigurasi dari file .env
func LoadConfig() {
	// Memuat file .env
	err := godotenv.Load()
	if err != nil {
		log.Println("Peringatan: Tidak dapat memuat file .env, menggunakan variabel environment yang ada")
	}

	AppConfig = Config{
		ServerPort: getEnv("SERVER_PORT", "8080"),
		DBHost:     getEnv("DB_HOST", "127.0.0.1"),
		DBPort:     getEnv("DB_PORT", "3306"),
		DBUser:     getEnv("DB_USER", "root"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "go_bisnis_db"),
		JWTSecret:  getEnv("JWT_SECRET_KEY", "default_secret_key_mohon_diganti"), // <-- BARU
	}

	// Validasi sederhana (contoh)
	if AppConfig.JWTSecret == "default_secret_key_mohon_diganti" {
		log.Println("PERINGATAN: JWT_SECRET_KEY menggunakan nilai default. Harap atur di .env untuk produksi.")
	}
}

// getEnv adalah helper untuk membaca env var dengan nilai default
func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
