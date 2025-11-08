package utils

import (
	"log"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword mengenkripsi password menggunakan bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		return "", err
	}
	return string(bytes), nil
}

// CheckPasswordHash membandingkan password plain-text dengan hash
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil // true jika cocok, false jika tidak
}
