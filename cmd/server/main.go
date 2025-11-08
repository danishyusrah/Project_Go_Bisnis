package main

import (
	"log"
	"net/http"

	"github.com/danishyusrah/go_bisnis/config"
	"github.com/danishyusrah/go_bisnis/internal/database"
	"github.com/danishyusrah/go_bisnis/internal/handlers"
	"github.com/danishyusrah/go_bisnis/internal/middleware"
	"github.com/gin-gonic/gin"
)

func main() {
	// Tahap 1: Muat Konfigurasi dari .env
	config.LoadConfig()
	cfg := config.AppConfig

	// Tahap 1: Inisialisasi Database
	database.InitDatabase(cfg)

	// Tahap 1: Inisialisasi Router Gin
	router := gin.Default()

	// Tahap 1: Sajikan file statis (CSS, JS) dari direktori /public
	// '/static' adalah URL, './public' adalah direktori lokal
	router.Static("/static", "./public")

	// Tahap 1: Muat template HTML dari direktori /templates
	router.LoadHTMLGlob("templates/*")

	// Tahap 2 & 3: Daftarkan semua rute
	setupRoutes(router)

	// Tahap 1: Jalankan server
	serverAddr := ":" + cfg.ServerPort
	log.Printf("Server berjalan di http://localhost%s", serverAddr)

	if err := router.Run(serverAddr); err != nil {
		log.Fatalf("Gagal menjalankan server: %v", err)
	}
}

// setupRoutes memisahkan definisi rute dari main() agar tetap bersih
func setupRoutes(router *gin.Engine) {

	// Inisialisasi semua handler (dari Tahap 3, 4, 5)
	productHandler := handlers.NewProductHandler()
	transactionHandler := handlers.NewTransactionHandler()
	dashboardHandler := handlers.NewDashboardHandler()

	// --- Rute Halaman Web (Frontend) ---
	// Grup ini menangani penyajian file HTML
	web := router.Group("/")
	{
		// Halaman Login (Tahap 6)
		web.GET("/", func(c *gin.Context) {
			c.HTML(http.StatusOK, "index.html", gin.H{
				"title": "Login - Go Bisnis",
			})
		})

		// Halaman Register (Tahap Pendaftaran)
		web.GET("/register", func(c *gin.Context) {
			c.HTML(http.StatusOK, "register.html", gin.H{
				"title": "Daftar Akun - Go Bisnis",
			})
		})

		// Halaman Dashboard (Tahap 6)
		web.GET("/dashboard.html", func(c *gin.Context) {
			c.HTML(http.StatusOK, "dashboard.html", gin.H{
				"title": "Dashboard - Go Bisnis",
			})
		})

		// Halaman Tambah Transaksi (Tahap 7)
		web.GET("/add-transaction.html", func(c *gin.Context) {
			c.HTML(http.StatusOK, "add-transaction.html", gin.H{
				"title": "Tambah Transaksi - Go Bisnis",
			})
		})

		// Halaman Daftar Produk (Tahap 8)
		web.GET("/products.html", func(c *gin.Context) {
			c.HTML(http.StatusOK, "products.html", gin.H{
				"title": "Manajemen Produk - Go Bisnis",
			})
		})

		// Halaman Tambah Produk (Tahap 8)
		web.GET("/add-product.html", func(c *gin.Context) {
			c.HTML(http.StatusOK, "add-product.html", gin.H{
				"title": "Tambah Produk - Go Bisnis",
			})
		})

		// Halaman Edit Produk (Tahap 9)
		web.GET("/edit-product.html", func(c *gin.Context) {
			c.HTML(http.StatusOK, "edit-product.html", gin.H{
				"title": "Edit Produk - Go Bisnis",
			})
		})

		// Halaman Laporan (Tahap 10) <-- BARU DITAMBAHKAN
		web.GET("/reports.html", func(c *gin.Context) {
			c.HTML(http.StatusOK, "reports.html", gin.H{
				"title": "Laporan Transaksi - Go Bisnis",
			})
		})

		// Halaman Pengaturan (Tahap 11) <-- BARU
		web.GET("/settings.html", func(c *gin.Context) {
			c.HTML(http.StatusOK, "settings.html", gin.H{
				"title": "Pengaturan Akun - Go Bisnis",
			})
		})
	}

	// --- Grup Rute untuk API v1 (Backend) ---
	apiV1 := router.Group("/api/v1")
	{
		// Rute Pengecekan Server
		apiV1.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "pong",
			})
		})

		// Rute Autentikasi (Tahap 2)
		apiV1.POST("/register", handlers.Register)
		apiV1.POST("/login", handlers.Login)

		// Rute yang Dilindungi (Memerlukan Token JWT)
		protected := apiV1.Group("/")
		protected.Use(middleware.AuthMiddleware()) // Terapkan middleware di sini
		{
			// Rute Profil (Tahap 2)
			protected.GET("/profile", handlers.GetProfile)

			// Rute Pengaturan Profil (Tahap 11) <-- BARU
			protected.PUT("/profile", handlers.UpdateProfile)   // Update data profil
			protected.PUT("/password", handlers.UpdatePassword) // Update password

			// Rute Produk (Tahap 3)
			protected.POST("/products", productHandler.CreateProduct)
			protected.GET("/products", productHandler.GetUserProducts)
			protected.GET("/products/:id", productHandler.GetProductByID)
			protected.PUT("/products/:id", productHandler.UpdateProduct)
			protected.DELETE("/products/:id", productHandler.DeleteProduct)

			// Rute Transaksi (Tahap 4)
			protected.POST("/transactions", transactionHandler.CreateTransaction)
			protected.GET("/transactions", transactionHandler.GetUserTransactions)
			protected.GET("/transactions/:id", transactionHandler.GetTransactionByID)

			// Rute Dashboard (Tahap 5)
			protected.GET("/dashboard/stats", dashboardHandler.GetDashboardStats)
		}
	}
}
