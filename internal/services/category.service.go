package services

import (
	"errors"

	"github.com/danishyusrah/go_bisnis/internal/database"
	"github.com/danishyusrah/go_bisnis/internal/dto"
	"github.com/danishyusrah/go_bisnis/internal/models"
	"gorm.io/gorm"
)

// CategoryService adalah struct untuk layanan terkait kategori
type CategoryService struct{}

// NewCategoryService membuat instance CategoryService baru
func NewCategoryService() *CategoryService {
	return &CategoryService{}
}

// CreateCategory adalah logika bisnis untuk membuat kategori baru
func (s *CategoryService) CreateCategory(input dto.CreateCategoryInput, userID uint) (models.Category, error) {
	db := database.DB

	// Cek duplikat (opsional, tapi bagus)
	var existing models.Category
	if err := db.Where("user_id = ? AND name = ? AND type = ?", userID, input.Name, input.Type).First(&existing).Error; err == nil {
		return models.Category{}, errors.New("kategori dengan nama dan tipe yang sama sudah ada")
	}

	newCategory := models.Category{
		Name:   input.Name,
		Type:   input.Type,
		UserID: userID,
	}

	if err := db.Create(&newCategory).Error; err != nil {
		return models.Category{}, err
	}

	return newCategory, nil
}

// GetUserCategories mengambil semua kategori yang dimiliki oleh user
// Kita akan ambil semua (INCOME dan EXPENSE) sekaligus
func (s *CategoryService) GetUserCategories(userID uint) ([]models.Category, error) {
	var categories []models.Category
	db := database.DB

	// Mengambil semua kategori milik user, diurutkan berdasarkan Tipe lalu Nama
	if err := db.Where("user_id = ?", userID).Order("type asc, name asc").Find(&categories).Error; err != nil {
		return nil, err
	}
	return categories, nil
}

// GetCategoryByID mengambil satu kategori, dan memvalidasi kepemilikan
func (s *CategoryService) GetCategoryByID(categoryID uint, userID uint) (models.Category, error) {
	var category models.Category
	db := database.DB

	if err := db.First(&category, categoryID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.Category{}, errors.New("kategori tidak ditemukan")
		}
		return models.Category{}, err
	}

	// VALIDASI KEPEMILIKAN
	if category.UserID != userID {
		return models.Category{}, errors.New("akses ditolak: Anda bukan pemilik kategori ini")
	}

	return category, nil
}

// UpdateCategory memperbarui kategori, dan memvalidasi kepemilikan
func (s *CategoryService) UpdateCategory(categoryID uint, input dto.UpdateCategoryInput, userID uint) (models.Category, error) {
	db := database.DB

	// Pertama, dapatkan kategori dan cek kepemilikan
	category, err := s.GetCategoryByID(categoryID, userID)
	if err != nil {
		return models.Category{}, err // Error (tidak ditemukan / bukan pemilik) sudah ditangani
	}

	// Update data
	category.Name = input.Name
	category.Type = input.Type

	if err := db.Save(&category).Error; err != nil {
		return models.Category{}, err
	}

	return category, nil
}

// DeleteCategory menghapus kategori, dan memvalidasi kepemilikan
func (s *CategoryService) DeleteCategory(categoryID uint, userID uint) error {
	db := database.DB

	// Pertama, dapatkan kategori dan cek kepemilikan
	category, err := s.GetCategoryByID(categoryID, userID)
	if err != nil {
		return err // Error (tidak ditemukan / bukan pemilik) sudah ditangani
	}

	// [PENTING] Cek apakah kategori ini sedang dipakai oleh transaksi
	var count int64
	if err := db.Model(&models.Transaction{}).Where("category_id = ?", categoryID).Count(&count).Error; err != nil {
		return errors.New("gagal memverifikasi penggunaan kategori")
	}

	if count > 0 {
		return errors.New("kategori tidak dapat dihapus karena masih digunakan oleh transaksi")
	}

	// Hapus kategori (GORM akan otomatis Soft Delete karena gorm.Model)
	if err := db.Delete(&category).Error; err != nil {
		return err
	}

	return nil
}
