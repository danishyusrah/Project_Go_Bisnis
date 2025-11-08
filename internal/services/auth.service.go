package services

import (
	"errors"

	"github.com/danishyusrah/go_bisnis/internal/database"
	"github.com/danishyusrah/go_bisnis/internal/dto" // <-- BARU

	// "github.com/danishyusrah/go_bisnis/internal/handlers" // <-- DIHAPUS
	"github.com/danishyusrah/go_bisnis/internal/models"
	"github.com/danishyusrah/go_bisnis/internal/utils"
	"gorm.io/gorm"
)

// RegisterUser adalah logika bisnis untuk mendaftarkan pengguna
func RegisterUser(input dto.RegisterInput) (models.User, error) { // <-- DIUBAH
	db := database.DB

	// Cek apakah username atau email sudah ada
	var existingUser models.User
	if err := db.Where("username = ? OR email = ?", input.Username, input.Email).First(&existingUser).Error; err == nil {
		// Jika ditemukan (err == nil), berarti user sudah ada
		return models.User{}, errors.New("username atau email sudah terdaftar")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		// Jika terjadi error selain 'record not found'
		return models.User{}, err
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(input.Password)
	if err != nil {
		return models.User{}, errors.New("gagal memproses password")
	}

	// Buat user baru
	newUser := models.User{
		Username:     input.Username,
		Email:        input.Email,
		PasswordHash: hashedPassword,
		FullName:     input.FullName,
	}

	// Simpan ke database
	if err := db.Create(&newUser).Error; err != nil {
		return models.User{}, errors.New("gagal menyimpan data pengguna")
	}

	return newUser, nil
}

// LoginUser adalah logika bisnis untuk login
func LoginUser(input dto.LoginInput) (string, error) { // <-- DIUBAH
	db := database.DB

	// Cari pengguna berdasarkan username
	var user models.User
	if err := db.Where("username = ?", input.Username).First(&user).Error; err != nil {
		// Jika tidak ditemukan atau error lain
		return "", errors.New("kredensial tidak valid")
	}

	// Cek password
	if !utils.CheckPasswordHash(input.Password, user.PasswordHash) {
		return "", errors.New("kredensial tidak valid")
	}

	// Jika berhasil, buat token JWT
	token, err := utils.GenerateJWT(user.ID)
	if err != nil {
		return "", errors.New("gagal membuat token login")
	}

	return token, nil
}

// --- FUNGSI BARU UNTUK TAHAP 11 ---

// UpdateUserProfile adalah logika bisnis untuk memperbarui profil pengguna
func UpdateUserProfile(userID uint, input dto.UpdateProfileInput) (models.User, error) {
	db := database.DB
	var user models.User

	// 1. Cari pengguna
	if err := db.First(&user, userID).Error; err != nil {
		return models.User{}, errors.New("pengguna tidak ditemukan")
	}

	// 2. Cek apakah email baru sudah digunakan oleh orang lain
	if input.Email != user.Email {
		var existingUser models.User
		if err := db.Where("email = ? AND id != ?", input.Email, userID).First(&existingUser).Error; err == nil {
			return models.User{}, errors.New("email sudah terdaftar pada akun lain")
		}
	}

	// 3. Update data
	user.FullName = input.FullName
	user.Email = input.Email

	// 4. Simpan perubahan
	if err := db.Save(&user).Error; err != nil {
		return models.User{}, errors.New("gagal memperbarui profil di database")
	}

	return user, nil
}

// UpdateUserPassword adalah logika bisnis untuk mengubah password
func UpdateUserPassword(userID uint, input dto.UpdatePasswordInput) error {
	db := database.DB
	var user models.User

	// 1. Cari pengguna
	if err := db.First(&user, userID).Error; err != nil {
		return errors.New("pengguna tidak ditemukan")
	}

	// 2. Validasi password lama
	// Ini adalah langkah keamanan yang profesional dan penting
	if !utils.CheckPasswordHash(input.OldPassword, user.PasswordHash) {
		return errors.New("password lama Anda salah")
	}

	// 3. Hash password baru
	newHashedPassword, err := utils.HashPassword(input.NewPassword)
	if err != nil {
		return errors.New("gagal memproses password baru")
	}

	// 4. Update password di database
	if err := db.Model(&user).Update("password_hash", newHashedPassword).Error; err != nil {
		return errors.New("gagal memperbarui password di database")
	}

	return nil
}
