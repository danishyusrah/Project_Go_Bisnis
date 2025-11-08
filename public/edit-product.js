// Menunggu hingga seluruh konten halaman (HTML) dimuat
document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Keamanan & Inisialisasi ---
    
    // Ambil token dari localStorage
    const token = localStorage.getItem("goBisnisToken");

    // GUARD: Jika tidak ada token, "tendang" kembali ke halaman login
    if (!token) {
        window.location.href = "/";
        return;
    }

    // Ambil elemen-elemen form
    const editProductForm = document.getElementById("editProductForm");
    const submitButton = document.getElementById("submitButton");
    const deleteButton = document.getElementById("deleteButton");
    const errorMessageEl = document.getElementById("errorMessage");
    const loadingOverlay = document.getElementById("loadingOverlay");

    // Ambil ID Produk dari URL (Query Parameter)
    // Cth: /edit-product.html?id=123
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");

    // GUARD: Jika tidak ada ID di URL, kembali ke halaman produk
    if (!productId) {
        alert("ID Produk tidak ditemukan.");
        window.location.href = "/products.html";
        return;
    }

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
        // Untuk DELETE, mungkin tidak ada body JSON
        if (response.status === 204 || response.status === 200) {
            try {
                return await response.json();
            } catch (e) {
                return { success: true }; // Sukses tanpa body
            }
        }
        return response.json();
    };

    // --- 3. Memuat Data Produk Awal ---

    const loadProductData = async () => {
        try {
            // Tampilkan loading
            loadingOverlay.classList.remove("hidden");

            // Panggil API untuk mengambil data produk spesifik
            const product = await fetchWithAuth(`/api/v1/products/${productId}`);
            
            // Isi data ke dalam form
            document.getElementById("name").value = product.name;
            document.getElementById("sku").value = product.sku;
            document.getElementById("selling_price").value = product.selling_price;
            document.getElementById("stock").value = product.stock;
            document.getElementById("purchase_price").value = product.purchase_price;
            document.getElementById("description").value = product.description;

            // Sembunyikan loading
            loadingOverlay.classList.add("hidden");

        } catch (error) {
            console.error("Error loading product data:", error);
            errorMessageEl.textContent = `Gagal memuat data produk: ${error.message}`;
            errorMessageEl.classList.remove("hidden");
            // Nonaktifkan form jika gagal load
            submitButton.disabled = true;
            deleteButton.disabled = true;
        }
    };

    // --- 4. Event Listener untuk Submit (Update) ---

    editProductForm.addEventListener("submit", async (event) => {
        event.preventDefault(); 

        submitButton.disabled = true;
        submitButton.textContent = "Menyimpan...";
        errorMessageEl.classList.add("hidden");

        try {
            const formData = new FormData(editProductForm);
            
            const payload = {
                name: formData.get("name"),
                sku: formData.get("sku"),
                description: formData.get("description"),
                selling_price: parseFloat(formData.get("selling_price")) || 0,
                purchase_price: parseFloat(formData.get("purchase_price")) || 0,
                stock: parseInt(formData.get("stock"), 10) || 0,
            };

            if (!payload.name || payload.selling_price < 0 || payload.stock < 0) {
                throw new Error("Nama Produk, Harga Jual, dan Stok wajib diisi.");
            }

            // Kirim data ke API backend (Metode PUT)
            await fetchWithAuth(`/api/v1/products/${productId}`, {
                method: "PUT",
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
            submitButton.textContent = "Simpan Perubahan";
        }
    });

    // --- 5. Event Listener untuk Hapus ---

    deleteButton.addEventListener("click", async () => {
        // Tampilkan konfirmasi (praktik profesional)
        // Kita tidak bisa pakai window.confirm() karena styling
        // Untuk sekarang kita pakai konfirmasi sederhana:
        if (!confirm("Apakah Anda yakin ingin menghapus produk ini? Stok akan dikosongkan.")) {
            return; // Batalkan jika user menekan "Cancel"
        }

        deleteButton.disabled = true;
        deleteButton.textContent = "Menghapus...";
        errorMessageEl.classList.add("hidden");
        submitButton.disabled = true; // Nonaktifkan tombol simpan juga

        try {
            // Panggil API backend (Metode DELETE)
            await fetchWithAuth(`/api/v1/products/${productId}`, {
                method: "DELETE",
            });

            // --- Sukses ---
            // Arahkan kembali ke halaman daftar produk
            alert("Produk berhasil dihapus.");
            window.location.href = "/products.html";

        } catch (error) {
            // --- Gagal ---
            errorMessageEl.textContent = error.message;
            errorMessageEl.classList.remove("hidden");
            deleteButton.disabled = false;
            deleteButton.textContent = "Hapus Produk";
            submitButton.disabled = false;
        }
    });

    // --- 6. Jalankan Load Data Awal ---
    loadProductData();

});