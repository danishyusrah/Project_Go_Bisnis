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

    // Ambil elemen-elemen form
    const addProductForm = document.getElementById("addProductForm");
    const submitButton = document.getElementById("submitButton");
    const errorMessageEl = document.getElementById("errorMessage");

    // --- 2. Fungsi Helper ---

    /**
     * Helper untuk memanggil API kita dengan header otorisasi
     */
    const fetchWithAuth = async (url, options = {}) => {
        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            ...options.headers,
        };
        const response = await fetch(url, { ...options, headers });

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

    // --- 3. Event Listener untuk Submit Form ---

    addProductForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // Mencegah form terkirim secara tradisional

        // Tampilkan status loading dan sembunyikan error
        submitButton.disabled = true;
        submitButton.textContent = "Menyimpan...";
        errorMessageEl.classList.add("hidden");

        try {
            // Ambil data dari form
            const formData = new FormData(addProductForm);
            
            // Buat payload JSON
            // Penting: Konversi angka dari string ke number (float/int)
            const payload = {
                name: formData.get("name"),
                sku: formData.get("sku"),
                description: formData.get("description"),
                selling_price: parseFloat(formData.get("selling_price")) || 0,
                purchase_price: parseFloat(formData.get("purchase_price")) || 0,
                stock: parseInt(formData.get("stock"), 10) || 0,
                // --- [BARU] ---
                batas_stok_minimum: parseInt(formData.get("batas_stok_minimum"), 10) || 0,
                // --- [AKHIR BARU] ---
            };

            // Validasi frontend sederhana
            if (!payload.name || payload.selling_price < 0 || payload.stock < 0) {
                throw new Error("Nama Produk, Harga Jual, dan Stok Awal wajib diisi.");
            }

            // Kirim data ke API backend
            await fetchWithAuth("/api/v1/products", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            // --- Sukses ---
            // Arahkan kembali ke halaman daftar produk
            window.location.href = "/products.html";

        } catch (error) {
            // --- Gagal ---
            errorMessageEl.textContent = error.message;
            errorMessageEl.classList.remove("hidden");
            submitButton.disabled = false;
            submitButton.textContent = "Simpan Produk";
        }
    });

});