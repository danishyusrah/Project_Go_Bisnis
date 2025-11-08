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

    // Ambil elemen dari HTML
    const transactionListEl = document.getElementById("transaction-list-full");

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

    // --- 3. Memuat Data Laporan Transaksi ---

    const loadAllTransactions = async () => {
        try {
            // Panggil API untuk mengambil SEMUA transaksi
            const transactions = await fetchWithAuth("/api/v1/transactions");

            // Kosongkan placeholder loading
            transactionListEl.innerHTML = "";

            if (transactions.length === 0) {
                transactionListEl.innerHTML = `<p class="text-gray-500 text-center py-10">Belum ada transaksi yang tercatat.</p>`;
                return;
            }

            // Render setiap transaksi
            transactions.forEach(tx => {
                const isIncome = tx.type === "INCOME";
                const iconBgClass = isIncome ? "bg-green-100" : "bg-red-100";
                const iconClass = isIncome ? "text-green-600" : "text-red-600";
                const amountClass = isIncome ? "text-green-600" : "text-red-600";
                const sign = isIncome ? "+" : "-";
                
                // Ambil deskripsi item pertama sebagai judul
                const title = tx.items[0]?.product_name || "Transaksi";
                // Format tanggal yang lebih detail untuk laporan
                const date = new Date(tx.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: '2-digit',
                    minute: '2-digit'
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
            console.error("Error loading all transactions:", error);
            transactionListEl.innerHTML = `<p class="text-red-500 text-center py-10">Gagal memuat riwayat transaksi.</p>`;
        }
    };

    // --- 4. Jalankan Fungsi Load ---
    loadAllTransactions();
});