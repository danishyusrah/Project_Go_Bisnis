package handlers

import (
	"net/http"

	"github.com/danishyusrah/go_bisnis/internal/database"
	"github.com/danishyusrah/go_bisnis/internal/dto" // <-- BARU
	"github.com/danishyusrah/go_bisnis/internal/models"
	"github.com/danishyusrah/go_bisnis/internal/services"
	"github.com/gin-gonic/gin"
)

// DTO (Data Transfer Object) untuk input registrasi
/*
[DEFINISI STRUCT DIHAPUS DARI SINI]
*/
// DTO untuk input login
/*
[DEFINISI STRUCT DIHAPUS DARI SINI]
*/
// UserResponse adalah DTO untuk data user yang dikirim ke client
/*
[DEFINISI STRUCT DIHAPUS DARI SINI]
*/

// Register menghandle registrasi pengguna baru
func Register(c *gin.Context) {
	var input dto.RegisterInput // <-- DIUBAH

	// Bind JSON dan validasi input
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Panggil service untuk mendaftarkan pengguna
	user, err := services.RegisterUser(input)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	// Buat respons yang aman (tanpa password)
	response := dto.UserResponse{ // <-- DIUBAH
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		FullName:  user.FullName,
		CreatedAt: user.CreatedAt.String(),
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Registrasi berhasil", "user": response})
}

// Login menghandle login pengguna
func Login(c *gin.Context) {
	var input dto.LoginInput // <-- DIUBAH

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Panggil service untuk login
	token, err := services.LoginUser(input)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Login berhasil", "token": token})
}

// GetProfile menghandle permintaan profil pengguna yang sedang login
func GetProfile(c *gin.Context) {
	// Ambil userID yang disimpan oleh AuthMiddleware
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Otorisasi gagal"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID.(uint)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pengguna tidak ditemukan"})
		return
	}

	// Kembalikan data profil yang aman
	response := dto.UserResponse{ // <-- DIUBAH
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		FullName:  user.FullName,
		CreatedAt: user.CreatedAt.String(),
	}

	c.JSON(http.StatusOK, gin.H{"user": response})
}

// --- FUNGSI BARU UNTUK TAHAP 11 ---

// UpdateProfile menangani pembaruan profil (Nama Lengkap, Email)
func UpdateProfile(c *gin.Context) {
	// 1. Ambil userID dari context (ditaruh oleh middleware)
	userIDraw, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Otorisasi gagal"})
		return
	}
	userID, ok := userIDraw.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Tipe UserID di context tidak valid"})
		return
	}

	// 2. Bind JSON ke DTO UpdateProfileInput
	var input dto.UpdateProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 3. Panggil service untuk update
	user, err := services.UpdateUserProfile(userID, input)
	if err != nil {
		// Tangani error jika email sudah terdaftar
		if err.Error() == "email sudah terdaftar pada akun lain" {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 4. Kembalikan data profil yang baru
	response := dto.UserResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		FullName:  user.FullName,
		CreatedAt: user.CreatedAt.String(),
	}
	c.JSON(http.StatusOK, gin.H{"message": "Profil berhasil diperbarui", "user": response})
}

// UpdatePassword menangani pembaruan password
func UpdatePassword(c *gin.Context) {
	// 1. Ambil userID dari context
	userIDraw, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Otorisasi gagal"})
		return
	}
	userID, ok := userIDraw.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Tipe UserID di context tidak valid"})
		return
	}

	// 2. Bind JSON ke DTO UpdatePasswordInput
	var input dto.UpdatePasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 3. Panggil service untuk update
	err := services.UpdateUserPassword(userID, input)
	if err != nil {
		// Tangani error jika password lama salah (profesional)
		if err.Error() == "password lama Anda salah" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()}) // 403 Forbidden
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 4. Kembalikan pesan sukses
	c.JSON(http.StatusOK, gin.H{"message": "Password berhasil diperbarui"})
}
