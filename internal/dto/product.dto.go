package dto

// CreateProductInput adalah DTO untuk membuat produk baru
type CreateProductInput struct {
	Name          string  `json:"name" binding:"required"`
	SKU           string  `json:"sku"`
	Description   string  `json:"description"`
	PurchasePrice float64 `json:"purchase_price" binding:"gte=0"`
	SellingPrice  float64 `json:"selling_price" binding:"required,gte=0"`
	Stock         int     `json:"stock" binding:"gte=0"`
	// --- [BARU] ---
	BatasStokMinimum int `json:"batas_stok_minimum" binding:"omitempty,gte=0"`
	// --- [AKHIR BARU] ---
}

// UpdateProductInput adalah DTO untuk memperbarui produk
type UpdateProductInput struct {
	Name          string  `json:"name"`
	SKU           string  `json:"sku"`
	Description   string  `json:"description"`
	PurchasePrice float64 `json:"purchase_price" binding:"omitempty,gte=0"`
	SellingPrice  float64 `json:"selling_price" binding:"omitempty,gte=0"`
	Stock         int     `json:"stock" binding:"omitempty,gte=0"`
	// --- [BARU] ---
	BatasStokMinimum int `json:"batas_stok_minimum" binding:"omitempty,gte=0"`
	// --- [AKHIR BARU] ---
}

// ProductResponse adalah DTO untuk data produk yang dikirim ke client
type ProductResponse struct {
	ID            uint    `json:"id"`
	Name          string  `json:"name"`
	SKU           string  `json:"sku"`
	Description   string  `json:"description"`
	PurchasePrice float64 `json:"purchase_price"`
	SellingPrice  float64 `json:"selling_price"`
	Stock         int     `json:"stock"`
	CreatedAt     string  `json:"created_at"`
	UpdatedAt     string  `json:"updated_at"`
	// --- [BARU] ---
	BatasStokMinimum int `json:"batas_stok_minimum"`
	// --- [AKHIR BARU] ---
}
