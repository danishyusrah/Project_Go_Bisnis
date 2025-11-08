package dto

// UpdateProfileInput adalah DTO untuk form 'Update Profil'
type UpdateProfileInput struct {
	FullName string `json:"full_name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
}

// UpdatePasswordInput adalah DTO untuk form 'Ubah Password'
type UpdatePasswordInput struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}
