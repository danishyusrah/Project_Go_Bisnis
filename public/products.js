// Menunggu hingga seluruh konten halaman (HTML) dimuat
document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Keamanan & Inisialisasi ---
    
    // Ambil token dari localStorage
    const token = localStorage.getItem("goBisnisToken");

    // GUARD: Jika tidak ada token, "tendang" kembali ke halaman login
    if (!token) {
        window.location.href = "/"; // Arahkan ke index.html (halaman login)
        return; // Hentikan eksekusi skrip
    }

    // Ambil elemen-elemen dari HTML
    const productListEl = document.getElementById("product-list");
    const addProductButton = document.getElementById("add-product-button");

    // --- 2. Fungsi Helper ---

    /**
     * Helper untuk memformat angka menjadi mata uang Rupiah
     */
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    /**
     * Helper untuk memanggil API kita dengan header otorisasi
     */
    const fetchWithAuth = async (url, options = {}) => {
        // Siapkan header default
        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`, // <-- Kunci utamanya di sini
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });

        // GUARD: Jika token tidak valid atau kedaluwarsa (error 401)
        if (response.status === 401) {
            localStorage.removeItem("goBisnisToken");
            window.location.href = "/";
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Gagal mengambil data");
        }

        return response.json();
    };

    // --- 3. Memuat Data Produk ---

    const loadProducts = async () => {
        try {
            const products = await fetchWithAuth("/api/v1/products");

            // Kosongkan placeholder loading
            productListEl.innerHTML = "";

            if (products.length === 0) {
                productListEl.innerHTML = `<p class="text-gray-500 text-center">Anda belum memiliki produk.</p>`;
                return;
            }

            // Render setiap produk
            products.forEach(product => {
                // <-- PERUBAHAN DI SINI: Ubah 'div' menjadi 'a' (link) -->
                const productElement = document.createElement("a");
                // Tambahkan class hover dan href
                productElement.className = "flex items-center p-4 bg-white rounded-xl card-shadow hover:bg-gray-50 transition-colors cursor-pointer";
                productElement.href = `/edit-product.html?id=${product.id}`; // <- Mengarahkan ke halaman edit
                
                productElement.innerHTML = `
                    <div class="p-2.5 bg-indigo-100 rounded-lg flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package text-indigo-600"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                    </div>
                    <div class="flex-1 ml-4">
                        <p class="text-base font-medium text-gray-900">${product.name}</p>
                        <p class="text-xs text-gray-500 mt-0.5">${product.sku || 'Tanpa SKU'}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-base font-semibold text-gray-900">${formatCurrency(product.selling_price)}</p>
                        <p class="text-sm font-medium ${product.stock <= 0 ? 'text-red-500' : 'text-gray-500'}">
                            Stok: ${product.stock}
                        </p>
                    </div>
                    <!-- Tambahkan ikon panah kanan untuk menunjukkan ini adalah link -->
                    <div class="ml-2 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                `;
                productListEl.appendChild(productElement);
            });

        } catch (error) {
            console.error("Error loading products:", error);
            productListEl.innerHTML = `<p class="text-red-500 text-center">Gagal memuat produk.</p>`;
        }
    };

    // --- 4. Event Listeners ---
    
    // Arahkan tombol "Tambah" ke halaman add-product.html
    addProductButton.addEventListener("click", (e) => {
        e.preventDefault(); // Mencegah perilaku default link
        window.location.href = "/add-product.html";
    });


    // --- 5. Jalankan Fungsi Load ---
    loadProducts();
});