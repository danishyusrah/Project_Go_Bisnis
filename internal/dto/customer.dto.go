package dto

// CustomerResponse adalah DTO untuk data pelanggan yang dikirim ke client
type CustomerResponse struct {
	ID        uint   `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Address   string `json:"address"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// CreateCustomerInput adalah DTO untuk membuat pelanggan baru
type CreateCustomerInput struct {
	Name    string `json:"name" binding:"required"`
	Email   string `json:"email" binding:"omitempty,email"`
	Phone   string `json:"phone"`
	Address string `json:"address"`
}

// UpdateCustomerInput adalah DTO untuk memperbarui pelanggan
type UpdateCustomerInput struct {
	Name    string `json:"name" binding:"omitempty"`
	Email   string `json:"email" binding:"omitempty,email"`
	Phone   string `json:"phone"`
	Address string `json:"address"`
}
