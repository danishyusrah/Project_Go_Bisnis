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
    const customerListEl = document.getElementById("customer-list");
    const addCustomerButton = document.getElementById("add-customer-button");

    // --- 2. Fungsi Helper ---

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
        
        // Handle 204 No Content
        if (response.status === 204) {
            return null;
        }
        return response.json();
    };

    // --- 3. Memuat Data Pelanggan ---

    const loadCustomers = async () => {
        try {
            const customers = (await fetchWithAuth("/api/v1/customers")) || [];

            // Kosongkan placeholder loading
            customerListEl.innerHTML = "";

            if (customers.length === 0) {
                customerListEl.innerHTML = `<p class="text-gray-500 text-center">Anda belum memiliki pelanggan.</p>`;
                return;
            }

            // Render setiap pelanggan
            customers.forEach(customer => {
                // Buat elemen 'a' (link) yang mengarah ke halaman edit
                const customerElement = document.createElement("a");
                customerElement.className = "flex items-center p-4 bg-white rounded-xl card-shadow hover:bg-gray-50 transition-colors cursor-pointer";
                // Kita akan buat halaman /edit-customer.html selanjutnya
                customerElement.href = `/edit-customer.html?id=${customer.id}`; 
                
                customerElement.innerHTML = `
                    <div class="p-2.5 bg-blue-100 rounded-lg flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user text-blue-600">
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                    </div>
                    <div class="flex-1 ml-4 min-w-0"> <!-- min-w-0 untuk truncate -->
                        <p class="text-base font-medium text-gray-900 truncate">${customer.name}</p>
                        <p class="text-xs text-gray-500 mt-0.5 truncate">
                            ${customer.phone || customer.email || 'Tidak ada info kontak'}
                        </p>
                    </div>
                    <div class="ml-2 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                `;
                customerListEl.appendChild(customerElement);
            });

        } catch (error) {
            console.error("Error loading customers:", error);
            customerListEl.innerHTML = `<p class="text-red-500 text-center">Gagal memuat pelanggan.</p>`;
        }
    };

    // --- 4. Event Listeners ---
    
    // Arahkan tombol "Tambah" ke halaman add-customer.html
    addCustomerButton.addEventListener("click", (e) => {
        e.preventDefault(); // Mencegah perilaku default link
        window.location.href = "/add-customer.html";
    });


    // --- 5. Jalankan Fungsi Load ---
    loadCustomers();
});