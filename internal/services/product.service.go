package services

import (
	"errors"
	"fmt" // <-- Impor 'fmt' untuk string formatting

	"github.com/danishyusrah/go_bisnis/internal/database"
	"github.com/danishyusrah/go_bisnis/internal/dto"
	"github.com/danishyusrah/go_bisnis/internal/models"
	"gorm.io/gorm"
)

// ProductService adalah struct untuk layanan terkait produk
type ProductService struct{}

// NewProductService membuat instance ProductService baru
func NewProductService() *ProductService {
	return &ProductService{}
}

// CreateProduct adalah logika bisnis untuk membuat produk
// Perhatikan bagaimana kita menerima userID untuk memastikan kepemilikan
func (s *ProductService) CreateProduct(input dto.CreateProductInput, userID uint) (models.Product, error) {
	db := database.DB

	newProduct := models.Product{
		Name:          input.Name,
		SKU:           input.SKU,
		Description:   input.Description,
		PurchasePrice: input.PurchasePrice,
		SellingPrice:  input.SellingPrice,
		Stock:         input.Stock,
		UserID:        userID, // Menetapkan pemilik produk
	}

	if err := db.Create(&newProduct).Error; err != nil {
		return models.Product{}, err
	}

	return newProduct, nil
}

// GetUserProducts mengambil semua produk yang dimiliki oleh user
// [DIPERBARUI] Sekarang menerima 'searchQuery'
func (s *ProductService) GetUserProducts(userID uint, searchQuery string) ([]models.Product, error) {
	var products []models.Product
	db := database.DB

	// Mulai query dengan filter UserID dan urutkan berdasarkan nama
	query := db.Where("user_id = ?", userID).Order("name asc")

	// [BARU] Tambahkan kondisi WHERE jika ada searchQuery
	if searchQuery != "" {
		// Buat format 'LIKE' (misal: "kopi" -> "%kopi%")
		searchTerm := fmt.Sprintf("%%%s%%", searchQuery)

		// Cari di kolom 'name' ATAU 'sku'
		query = query.Where("name LIKE ? OR sku LIKE ?", searchTerm, searchTerm)
	}

	// Eksekusi query
	if err := query.Find(&products).Error; err != nil {
		return nil, err
	}
	return products, nil
}

// GetProductByID mengambil satu produk, dan memvalidasi kepemilikan
func (s *ProductService) GetProductByID(productID uint, userID uint) (models.Product, error) {
	var product models.Product
	db := database.DB

	if err := db.First(&product, productID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.Product{}, errors.New("produk tidak ditemukan")
		}
		return models.Product{}, err
	}

	// VALIDASI KEPEMILIKAN: Ini adalah bagian profesional
	if product.UserID != userID {
		return models.Product{}, errors.New("akses ditolak: Anda bukan pemilik produk ini")
	}

	return product, nil
}

// UpdateProduct memperbarui produk, dan memvalidasi kepemilikan
func (s *ProductService) UpdateProduct(productID uint, input dto.UpdateProductInput, userID uint) (models.Product, error) {
	db := database.DB

	// Pertama, dapatkan produk dan cek kepemilikan
	product, err := s.GetProductByID(productID, userID)
	if err != nil {
		return models.Product{}, err // Error (tidak ditemukan / bukan pemilik) sudah ditangani
	}

	// Update data
	product.Name = input.Name
	product.SKU = input.SKU
	product.Description = input.Description
	product.PurchasePrice = input.PurchasePrice
	product.SellingPrice = input.SellingPrice
	product.Stock = input.Stock

	if err := db.Save(&product).Error; err != nil {
		return models.Product{}, err
	}

	return product, nil
}

// DeleteProduct menghapus produk, dan memvalidasi kepemilikan
func (s *ProductService) DeleteProduct(productID uint, userID uint) error {
	db := database.DB

	// Pertama, dapatkan produk dan cek kepemilikan
	product, err := s.GetProductByID(productID, userID)
	if err != nil {
		return err // Error (tidak ditemukan / bukan pemilik) sudah ditangani
	}

	// Hapus produk
	// Kita gunakan Unscoped() untuk Hard Delete, atau biarkan saja untuk Soft Delete (jika gorm.Model)
	if err := db.Delete(&product).Error; err != nil {
		return err
	}

	return nil
}
