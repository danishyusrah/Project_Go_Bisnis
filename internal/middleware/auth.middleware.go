package middleware

import (
	"net/http"
	"strings"

	"github.com/danishyusrah/go_bisnis/internal/utils"
	"github.com/gin-gonic/gin"
)

// AuthMiddleware adalah middleware untuk memvalidasi token JWT
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Header otorisasi tidak ada"})
			return
		}

		// Token harus dalam format "Bearer [token]"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Format header otorisasi tidak valid"})
			return
		}

		tokenString := parts[1]

		// Validasi token
		claims, err := utils.ValidateJWT(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token tidak valid atau kadaluarsa"})
			return
		}

		// Simpan UserID di context agar bisa diakses oleh handler selanjutnya
		c.Set("userID", claims.UserID)

		// Lanjutkan ke handler berikutnya
		c.Next()
	}
}
