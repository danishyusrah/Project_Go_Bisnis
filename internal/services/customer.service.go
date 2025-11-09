package services

import (
	"errors"

	"github.com/danishyusrah/go_bisnis/internal/database"
	"github.com/danishyusrah/go_bisnis/internal/dto"
	"github.com/danishyusrah/go_bisnis/internal/models"
	"gorm.io/gorm"
)

// CustomerService adalah struct untuk layanan terkait pelanggan
type CustomerService struct{}

// NewCustomerService membuat instance CustomerService baru
func NewCustomerService() *CustomerService {
	return &CustomerService{}
}

// CreateCustomer adalah logika bisnis untuk membuat pelanggan baru
func (s *CustomerService) CreateCustomer(input dto.CreateCustomerInput, userID uint) (models.Customer, error) {
	db := database.DB

	newCustomer := models.Customer{
		Name:    input.Name,
		Email:   input.Email,
		Phone:   input.Phone,
		Address: input.Address,
		UserID:  userID, // Menetapkan pemilik pelanggan
	}

	if err := db.Create(&newCustomer).Error; err != nil {
		return models.Customer{}, err
	}

	return newCustomer, nil
}

// GetUserCustomers mengambil semua pelanggan yang dimiliki oleh user
func (s *CustomerService) GetUserCustomers(userID uint) ([]models.Customer, error) {
	var customers []models.Customer
	db := database.DB

	// HANYA mengambil pelanggan milik userID yang sedang login
	// Diurutkan berdasarkan nama A-Z
	if err := db.Where("user_id = ?", userID).Order("name asc").Find(&customers).Error; err != nil {
		return nil, err
	}
	return customers, nil
}

// GetCustomerByID mengambil satu pelanggan, dan memvalidasi kepemilikan
func (s *CustomerService) GetCustomerByID(customerID uint, userID uint) (models.Customer, error) {
	var customer models.Customer
	db := database.DB

	if err := db.First(&customer, customerID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.Customer{}, errors.New("pelanggan tidak ditemukan")
		}
		return models.Customer{}, err
	}

	// VALIDASI KEPEMILIKAN: Ini adalah bagian profesional
	if customer.UserID != userID {
		return models.Customer{}, errors.New("akses ditolak: Anda bukan pemilik pelanggan ini")
	}

	return customer, nil
}

// UpdateCustomer memperbarui pelanggan, dan memvalidasi kepemilikan
func (s *CustomerService) UpdateCustomer(customerID uint, input dto.UpdateCustomerInput, userID uint) (models.Customer, error) {
	db := database.DB

	// Pertama, dapatkan pelanggan dan cek kepemilikan
	customer, err := s.GetCustomerByID(customerID, userID)
	if err != nil {
		return models.Customer{}, err // Error (tidak ditemukan / bukan pemilik) sudah ditangani
	}

	// Update data (hanya jika diisi di input, menggunakan model)
	// Kita bisa gunakan 'Updates' untuk pembaruan parsial yang lebih efisien
	updateData := models.Customer{
		Name:    input.Name,
		Email:   input.Email,
		Phone:   input.Phone,
		Address: input.Address,
	}

	if err := db.Model(&customer).Updates(updateData).Error; err != nil {
		return models.Customer{}, err
	}

	return customer, nil
}

// DeleteCustomer menghapus pelanggan, dan memvalidasi kepemilikan
func (s *CustomerService) DeleteCustomer(customerID uint, userID uint) error {
	db := database.DB

	// Pertama, dapatkan pelanggan dan cek kepemilikan
	customer, err := s.GetCustomerByID(customerID, userID)
	if err != nil {
		return err // Error (tidak ditemukan / bukan pemilik) sudah ditangani
	}

	// Hapus pelanggan (GORM akan otomatis Soft Delete karena gorm.Model)
	if err := db.Delete(&customer).Error; err != nil {
		return err
	}

	return nil
}
