package dto

// DTO (Data Transfer Object) untuk input registrasi
type RegisterInput struct {
	Username string `json:"username" binding:"required,min=4"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	FullName string `json:"full_name"`
}

// DTO untuk input login
type LoginInput struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// UserResponse adalah DTO untuk data user yang dikirim ke client
// (Menyembunyikan PasswordHash)
type UserResponse struct {
	ID        uint   `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	FullName  string `json:"full_name"`
	CreatedAt string `json:"created_at"`
}
