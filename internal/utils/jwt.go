package utils

import (
	"fmt"
	"log"
	"time"

	"github.com/danishyusrah/go_bisnis/config"
	"github.com/golang-jwt/jwt/v5"
)

// Claims kustom untuk data di dalam token
type JwtClaims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

// GenerateJWT membuat token JWT baru untuk seorang pengguna
func GenerateJWT(userID uint) (string, error) {
	cfg := config.AppConfig

	// Tentukan masa berlaku token (misal: 72 jam)
	expirationTime := time.Now().Add(72 * time.Hour)

	claims := &JwtClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "go_bisnis_app",
		},
	}

	// Buat token dengan claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Tanda tangani token dengan kunci rahasia
	tokenString, err := token.SignedString([]byte(cfg.JWTSecret))
	if err != nil {
		log.Printf("Error signing JWT: %v", err)
		return "", err
	}

	return tokenString, nil
}

// ValidateJWT memvalidasi token string
func ValidateJWT(tokenString string) (*JwtClaims, error) {
	cfg := config.AppConfig

	claims := &JwtClaims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		// Pastikan metode signing-nya adalah HS256
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("metode signing tidak terduga: %v", token.Header["alg"])
		}
		return []byte(cfg.JWTSecret), nil
	})

	if err != nil {
		log.Printf("Error parsing JWT: %v", err)
		return nil, err
	}

	if !token.Valid {
		return nil, fmt.Errorf("token tidak valid")
	}

	return claims, nil
}
