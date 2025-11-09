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
    const searchBar = document.getElementById("searchBarReports"); // <-- [BARU] Ambil search bar
    let debounceTimer; // <-- [BARU] Timer untuk debounce

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
        // Handle 204 No Content (jika ada)
        if (response.status === 204) {
            return null;
        }
        return response.json();
    };

    // --- 3. Memuat Data Laporan Transaksi ---

    /**
     * [DIPERBARUI] loadAllTransactions sekarang menerima query pencarian
     * @param {string} searchQuery - Teks yang akan dicari
     */
    const loadAllTransactions = async (searchQuery = "") => {
        try {
            // Tampilkan skeleton loader (berguna saat mencari)
            transactionListEl.innerHTML = `
                <div class="flex items-center p-4 bg-white rounded-xl card-shadow">
                    <div class="p-2.5 skeleton rounded-lg flex-shrink-0 h-10 w-10"></div>
                    <div class="flex-1 ml-4 space-y-2">
                        <p class="skeleton h-4 w-3/4"></p>
                        <p class="skeleton h-3 w-1/2"></p>
                    </div>
                    <span class="skeleton h-5 w-20"></span>
                </div>`;

            // [BARU] Tambahkan query ke URL jika ada
            let apiUrl = "/api/v1/transactions";
            if (searchQuery) {
                apiUrl += `?search=${encodeURIComponent(searchQuery)}`;
            }

            // Panggil API untuk mengambil SEMUA transaksi
            // API ini sekarang juga mengembalikan 'customer_name'
            const transactions = (await fetchWithAuth(apiUrl)) || [];

            // Kosongkan placeholder loading
            transactionListEl.innerHTML = "";

            if (transactions.length === 0) {
                 if (searchQuery) {
                    transactionListEl.innerHTML = `<p class="text-gray-500 text-center py-10">Transaksi "${searchQuery}" tidak ditemukan.</p>`;
                } else {
                    transactionListEl.innerHTML = `<p class="text-gray-500 text-center py-10">Belum ada transaksi yang tercatat.</p>`;
                }
                return;
            }

            // Render setiap transaksi
            transactions.forEach(tx => {
                const isIncome = tx.type === "INCOME";
                const iconBgClass = isIncome ? "bg-green-100" : "bg-red-100";
                const iconClass = isIncome ? "text-green-600" : "text-red-600";
                const amountClass = isIncome ? "text-green-600" : "text-red-600";
                const sign = isIncome ? "+" : "-";
                
                const title = tx.items[0]?.product_name || "Transaksi";
                const date = new Date(tx.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const customerName = tx.customer_name; // API sudah memberi default "Umum"

                const txElement = document.createElement("div");
                txElement.className = "flex items-center p-4 bg-white rounded-xl card-shadow";
                txElement.innerHTML = `
                    <div class="p-2.5 ${iconBgClass} rounded-lg flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${iconClass}">
                            ${isIncome ? 
                                `<path d="M12 5v14"/> <path d="m17 14-5-5-5 5"/>` : 
                                `<path d="M12 5v14"/> <path d="m17 10-5 5-5-5"/>`
                            }
                        </svg>
                    </div>
                    <div class="flex-1 ml-4 min-w-0">
                        <p class="text-base font-medium text-gray-900 truncate">${title}</p>
                        <p class="text-xs text-gray-500 mt-0.5">${date} • ${customerName}</p>
                    </div>
                    <span class="text-base font-semibold ${amountClass} flex-shrink-0 ml-2">
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

    // --- 4. Event Listeners ---

    // [BARU] Event listener untuk Search Bar (dengan Debounce)
    searchBar.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value;

        debounceTimer = setTimeout(() => {
            loadAllTransactions(query);
        }, 300); // Jeda 300ms
    });


    // --- 5. Jalankan Fungsi Load ---
    loadAllTransactions(); // Muat data awal (tanpa pencarian)
});