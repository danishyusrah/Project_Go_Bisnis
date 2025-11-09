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
    const addCustomerForm = document.getElementById("addCustomerForm");
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
        // Handle 204 No Content
        if (response.status === 204) {
            return null;
        }
        return response.json();
    };

    // --- 3. Event Listener untuk Submit Form ---

    addCustomerForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // Mencegah form terkirim secara tradisional

        // Tampilkan status loading dan sembunyikan error
        submitButton.disabled = true;
        submitButton.textContent = "Menyimpan...";
        errorMessageEl.classList.add("hidden");

        try {
            // Ambil data dari form
            const formData = new FormData(addCustomerForm);
            
            // Buat payload JSON
            const payload = {
                name: formData.get("name"),
                email: formData.get("email"),
                phone: formData.get("phone"),
                address: formData.get("address"),
            };

            // Validasi frontend sederhana
            if (!payload.name) {
                throw new Error("Nama Pelanggan wajib diisi.");
            }

            // Kirim data ke API backend
            await fetchWithAuth("/api/v1/customers", {
                method: "POST",
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
            submitButton.textContent = "Simpan Pelanggan";
        }
    });

});