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
    const userFullNameEl = document.getElementById("userFullName");
    const netProfitEl = document.getElementById("netProfit");
    const totalIncomeEl = document.getElementById("totalIncome");
    const totalExpenseEl = document.getElementById("totalExpense");
    const currentMonthEl = document.getElementById("currentMonth");
    const transactionListEl = document.getElementById("transactionList");
    const logoutButton = document.getElementById("logoutButton");

    // --- 2. Fungsi Helper (Sangat Profesional) ---

    /**
     * Helper untuk memformat angka menjadi mata uang Rupiah
     * @param {number} amount - Jumlah angka
     * @returns {string} - String berformat Rp 1.234.567
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
     * Ini adalah praktik yang sangat baik untuk menghindari pengulangan kode
     * @param {string} url - URL API (misal: "/api/v1/profile")
     * @param {object} options - Opsi fetch (method, body, dll.)
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
            // Hapus token yang rusak/kedaluwarsa
            localStorage.removeItem("goBisnisToken");
            // Tendang ke halaman login
            window.location.href = "/";
            return; // Hentikan
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Gagal mengambil data");
        }

        return response.json();
    };

    // --- 3. Memuat Data dari API ---

    // Fungsi untuk memuat data profil pengguna
    const loadProfile = async () => {
        try {
            const data = await fetchWithAuth("/api/v1/profile");
            userFullNameEl.textContent = data.user.full_name || data.user.username;
        } catch (error) {
            console.error("Error loading profile:", error);
            userFullNameEl.textContent = "Gagal memuat";
        }
    };

    // Fungsi untuk memuat statistik dashboard
    const loadDashboardStats = async () => {
        try {
            const stats = await fetchWithAuth("/api/v1/dashboard/stats");
            
            // Isi data ke elemen HTML
            netProfitEl.textContent = formatCurrency(stats.net_profit);
            totalIncomeEl.textContent = formatCurrency(stats.total_income);
            totalExpenseEl.textContent = formatCurrency(stats.total_expense);
            
            // Tampilkan bulan ini (contoh: November 2025)
            currentMonthEl.textContent = new Date().toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
            });

        } catch (error) {
            console.error("Error loading dashboard stats:", error);
            netProfitEl.textContent = "Error";
            totalIncomeEl.textContent = "Error";
            totalExpenseEl.textContent = "Error";
        }
    };

    // Fungsi untuk memuat transaksi terakhir
    const loadTransactions = async () => {
        try {
            const transactions = await fetchWithAuth("/api/v1/transactions");

            // Kosongkan placeholder loading
            transactionListEl.innerHTML = "";

            if (transactions.length === 0) {
                transactionListEl.innerHTML = `<p class="text-gray-500 text-center">Belum ada transaksi bulan ini.</p>`;
                return;
            }

            // Batasi hanya 5 transaksi terbaru untuk dashboard
            transactions.slice(0, 5).forEach(tx => {
                const isIncome = tx.type === "INCOME";
                const iconBgClass = isIncome ? "bg-green-100" : "bg-red-100";
                const iconClass = isIncome ? "text-green-600" : "text-red-600";
                const amountClass = isIncome ? "text-green-600" : "text-red-600";
                const sign = isIncome ? "+" : "-";
                
                // Ambil deskripsi item pertama sebagai judul
                const title = tx.items[0]?.product_name || "Transaksi";
                const date = new Date(tx.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                });

                // Buat elemen HTML untuk setiap transaksi
                const txElement = document.createElement("div");
                txElement.className = "flex items-center p-4 bg-white rounded-xl card-shadow";
                txElement.innerHTML = `
                    <div class="p-2.5 ${iconBgClass} rounded-lg flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${iconClass}">
                            ${isIncome ? 
                                `<circle cx="12" cy="12" r="10"/><path d="m8 12 4-4 4 4"/><path d="M12 16V8"/>` : 
                                `<circle cx="12" cy="12" r="10"/><path d="m16 12-4 4-4-4"/><path d="M12 8v8"/>`
                            }
                        </svg>
                    </div>
                    <div class="flex-1 ml-4">
                        <p class="text-base font-medium text-gray-900">${title}</p>
                        <p class="text-xs text-gray-500 mt-0.5">${date} • ${tx.customer || 'Umum'}</p>
                    </div>
                    <span class="text-base font-semibold ${amountClass} flex-shrink-0">
                        ${sign} ${formatCurrency(tx.total_amount)}
                    </span>
                `;
                
                transactionListEl.appendChild(txElement);
            });

        } catch (error) {
            console.error("Error loading transactions:", error);
            transactionListEl.innerHTML = `<p class="text-red-500 text-center">Gagal memuat transaksi.</p>`;
        }
    };

    // --- 4. Event Listener Logout ---
    logoutButton.addEventListener("click", () => {
        // Hapus token dari penyimpanan
        localStorage.removeItem("goBisnisToken");
        // Arahkan kembali ke halaman login
        window.location.href = "/";
    });

    // --- 5. Jalankan Semua Fungsi Load ---
    loadProfile();
    loadDashboardStats();
    loadTransactions();
});