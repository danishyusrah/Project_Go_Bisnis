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
                // [DIUBAH] Sesuaikan ikon untuk tipe Modal
                let iconBgClass = isIncome ? "bg-green-100" : "bg-red-100";
                let iconClass = isIncome ? "text-green-600" : "text-red-600";
                let iconSvg = isIncome ? 
                    `<path d="M12 5v14"/> <path d="m17 14-5-5-5 5"/>` : 
                    `<path d="M12 5v14"/> <path d="m17 10-5 5-5-5"/>`;

                if (tx.type === "CAPITAL") {
                    iconBgClass = "bg-blue-100";
                    iconClass = "text-blue-600";
                    // Ikon dompet
                    iconSvg = `<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>`;
                }

                const amountClass = isIncome || tx.type === "CAPITAL" ? "text-green-600" : "text-red-600";
                const sign = isIncome || tx.type === "CAPITAL" ? "+" : "-";
                
                const title = tx.items[0]?.product_name || (tx.type === "CAPITAL" ? "Setoran Modal" : "Transaksi");
                const date = new Date(tx.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const customerName = tx.customer_name; // API sudah memberi default "Umum"

                // --- [BARU] Logika untuk Status Pembayaran ---
                let statusHtml = `<p class="text-xs text-gray-500 mt-0.5">${date} • ${customerName}</p>`; // Default

                if (tx.payment_status === 'BELUM LUNAS') {
                    let statusBadge = `<span class="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Belum Lunas</span>`;
                    
                    if (tx.due_date) {
                        const dueDate = new Date(tx.due_date);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0); // Set ke awal hari

                        // Hanya tampilkan tanggal jika belum lewat
                        if (dueDate >= today) {
                             statusBadge += `<span class="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full ml-1.5">Jatuh Tempo: ${dueDate.toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}</span>`;
                        } else {
                            // Jika sudah lewat
                            statusBadge = `<span class="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">LEWAT JATUH TEMPO</span>`;
                        }
                    }
                    
                    // Ganti HTML default dengan HTML status
                    // Tampilkan status di atas tanggal
                    statusHtml = `<div class="mt-1 flex items-center flex-wrap gap-1">${statusBadge}</div>` + statusHtml; 
                }
                // --- [AKHIR BARU] ---


                const txElement = document.createElement("div");
                txElement.className = "flex items-center p-4 bg-white rounded-xl card-shadow";
                txElement.innerHTML = `
                    <div class="p-2.5 ${iconBgClass} rounded-lg flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${iconClass}">
                            ${iconSvg}
                        </svg>
                    </div>
                    <div class="flex-1 ml-4 min-w-0">
                        <p class="text-base font-medium text-gray-900 truncate">${title}</p>
                        ${statusHtml} <!-- [DIUBAH] Menggunakan HTML dinamis -->
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