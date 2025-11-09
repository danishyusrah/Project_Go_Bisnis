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
    const editCustomerForm = document.getElementById("editCustomerForm");
    const submitButton = document.getElementById("submitButton");
    const deleteButton = document.getElementById("deleteButton");
    const errorMessageEl = document.getElementById("errorMessage");
    const loadingOverlay = document.getElementById("loadingOverlay");

    // Ambil ID Pelanggan dari URL (Query Parameter)
    // Cth: /edit-customer.html?id=123
    const urlParams = new URLSearchParams(window.location.search);
    const customerId = urlParams.get("id");

    // GUARD: Jika tidak ada ID di URL, kembali ke halaman pelanggan
    if (!customerId) {
        alert("ID Pelanggan tidak ditemukan."); // Mengikuti pola dari edit-product.js
        window.location.href = "/customers.html";
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
        
        // Cek jika response OK tapi tidak ada body (cth: DELETE)
        if (response.ok && response.status !== 204) {
             try {
                return await response.json();
            } catch (e) {
                return { success: true }; // Sukses tanpa body
            }
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Gagal mengambil data");
        }
        
        return { success: true }; // Untuk 204 No Content (DELETE sukses)
    };

    // --- 3. Memuat Data Pelanggan Awal ---

    const loadCustomerData = async () => {
        try {
            // Tampilkan loading
            loadingOverlay.classList.remove("hidden");

            // Panggil API untuk mengambil data pelanggan spesifik
            const customer = await fetchWithAuth(`/api/v1/customers/${customerId}`);
            
            // Isi data ke dalam form
            document.getElementById("name").value = customer.name;
            document.getElementById("email").value = customer.email;
            document.getElementById("phone").value = customer.phone;
            document.getElementById("address").value = customer.address;

            // Sembunyikan loading
            loadingOverlay.classList.add("hidden");

        } catch (error) {
            console.error("Error loading customer data:", error);
            errorMessageEl.textContent = `Gagal memuat data pelanggan: ${error.message}`;
            errorMessageEl.classList.remove("hidden");
            // Nonaktifkan form jika gagal load
            submitButton.disabled = true;
            deleteButton.disabled = true;
        }
    };

    // --- 4. Event Listener untuk Submit (Update) ---

    editCustomerForm.addEventListener("submit", async (event) => {
        event.preventDefault(); 

        submitButton.disabled = true;
        submitButton.textContent = "Menyimpan...";
        errorMessageEl.classList.add("hidden");

        try {
            const formData = new FormData(editCustomerForm);
            
            const payload = {
                name: formData.get("name"),
                email: formData.get("email"),
                phone: formData.get("phone"),
                address: formData.get("address"),
            };

            if (!payload.name) {
                throw new Error("Nama Pelanggan wajib diisi.");
            }

            // Kirim data ke API backend (Metode PUT)
            await fetchWithAuth(`/api/v1/customers/${customerId}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });

            // --- Sukses ---
            // Arahkan kembali ke halaman daftar pelanggan
            window.location.href = "/customers.html";

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
        // Menggunakan konfirmasi (mengikuti pola dari edit-product.js)
        if (!confirm("Apakah Anda yakin ingin menghapus pelanggan ini?")) {
            return; // Batalkan jika user menekan "Cancel"
        }

        deleteButton.disabled = true;
        deleteButton.textContent = "Menghapus...";
        errorMessageEl.classList.add("hidden");
        submitButton.disabled = true; // Nonaktifkan tombol simpan juga

        try {
            // Panggil API backend (Metode DELETE)
            await fetchWithAuth(`/api/v1/customers/${customerId}`, {
                method: "DELETE",
            });

            // --- Sukses ---
            // Arahkan kembali ke halaman daftar pelanggan
            alert("Pelanggan berhasil dihapus.");
            window.location.href = "/customers.html";

        } catch (error) {
            // --- Gagal ---
            errorMessageEl.textContent = error.message;
            errorMessageEl.classList.remove("hidden");
            deleteButton.disabled = false;
            deleteButton.textContent = "Hapus Pelanggan";
            submitButton.disabled = false;
        }
    });

    // --- 6. Jalankan Load Data Awal ---
    loadCustomerData();

});