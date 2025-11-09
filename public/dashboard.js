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
    const netProfitLabelEl = document.getElementById("netProfitLabel"); // Label Laba Bersih
    const totalIncomeEl = document.getElementById("totalIncome");
    const totalExpenseEl = document.getElementById("totalExpense");
    const dateRangeLabelEl = document.getElementById("dateRangeLabel"); // Label rentang tanggal
    const incomeLabelEl = document.getElementById("incomeLabel");
    const expenseLabelEl = document.getElementById("expenseLabel");
    const transactionListEl = document.getElementById("transactionList");
    const logoutButton = document.getElementById("logoutButton");
    
    // Ambil elemen filter
    const filterButtons = document.querySelectorAll(".filter-button");
    
    // Ambil elemen Grafik
    const chartContext = document.getElementById("mainChart").getContext("2d");
    const chartSkeleton = document.getElementById("chartSkeleton");
    let mainChartInstance = null; // Untuk menyimpan instance Chart

    // Variabel state
    let currentFilter = "this-month"; // Filter aktif saat ini
    let currentFilterLabel = "Bulan Ini"; // Label untuk UI

    // --- 2. Fungsi Helper (Sangat Profesional) ---

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

    /**
     * [BARU] Helper untuk menghitung rentang tanggal
     * @returns {string} - Query string (misal: "?from=...&to=...")
     */
    const getDateRangeQuery = () => {
        const now = new Date();
        let startDate, endDate;
        endDate = new Date(); // Selalu berakhir hari ini (sampai akhir hari)
        endDate.setHours(23, 59, 59, 999);

        switch (currentFilter) {
            case "last-7-days":
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
                currentFilterLabel = "7 Hari Terakhir";
                dateRangeLabelEl.textContent = `${startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} - ${endDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}`;
                break;
            
            case "last-month":
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Hari terakhir bulan lalu
                currentFilterLabel = "Bulan Lalu";
                dateRangeLabelEl.textContent = startDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
                break;
            
            case "this-month":
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                currentFilterLabel = "Bulan Ini";
                dateRangeLabelEl.textContent = startDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
                break;
        }
        
        // Set awal hari untuk startDate
        startDate.setHours(0, 0, 0, 0);

        // Format ke RFC3339 (ISO string) yang dimengerti Go
        const fromQuery = `from=${startDate.toISOString()}`;
        const toQuery = `to=${endDate.toISOString()}`;
        
        return `?${fromQuery}&${toQuery}`;
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
        const dateQuery = getDateRangeQuery(); // Dapatkan query string tanggal
        
        try {
            const stats = await fetchWithAuth(`/api/v1/dashboard/stats${dateQuery}`);
            
            // Isi data ke elemen HTML
            netProfitEl.textContent = formatCurrency(stats.net_profit);
            totalIncomeEl.textContent = formatCurrency(stats.total_income);
            totalExpenseEl.textContent = formatCurrency(stats.total_expense);
            
            // Perbarui label
            netProfitLabelEl.textContent = `Laba Bersih (${currentFilterLabel})`;
            incomeLabelEl.textContent = currentFilterLabel;
            expenseLabelEl.textContent = currentFilterLabel;

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
            // Catatan: API /api/v1/transactions belum difilter tanggal,
            // jadi ini akan selalu menampilkan 5 transaksi TERBARU secara keseluruhan.
            // (Untuk performa lebih baik, idealnya API ini juga difilter)
            const transactions = await fetchWithAuth("/api/v1/transactions");

            transactionListEl.innerHTML = ""; // Kosongkan placeholder loading

            if (!transactions || transactions.length === 0) {
                transactionListEl.innerHTML = `<p class="text-gray-500 text-center">Belum ada transaksi.</p>`;
                return;
            }

            // Batasi hanya 5 transaksi terbaru untuk dashboard
            transactions.slice(0, 5).forEach(tx => {
                const isIncome = tx.type === "INCOME";
                const iconBgClass = isIncome ? "bg-green-100" : "bg-red-100";
                const iconClass = isIncome ? "text-green-600" : "text-red-600";
                const amountClass = isIncome ? "text-green-600" : "text-red-600";
                const sign = isIncome ? "+" : "-";
                
                const title = tx.items[0]?.product_name || "Transaksi";
                const date = new Date(tx.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short"
                });

                // [DIUBAH] Gunakan customer_name dari API
                const customerName = tx.customer_name || "Umum"; 

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
                    <div class="flex-1 ml-4">
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
            console.error("Error loading transactions:", error);
            transactionListEl.innerHTML = `<p class="text-red-500 text-center">Gagal memuat transaksi.</p>`;
        }
    };

    /**
     * [BARU] Fungsi untuk memuat dan menggambar grafik
     */
    const loadDashboardChart = async () => {
        const dateQuery = getDateRangeQuery();
        
        // Tampilkan skeleton, sembunyikan canvas
        chartSkeleton.classList.remove("hidden");
        chartContext.canvas.style.display = 'none';

        if (mainChartInstance) {
            mainChartInstance.destroy(); // Hancurkan grafik lama
        }
        
        try {
            const chartData = await fetchWithAuth(`/api/v1/dashboard/chart${dateQuery}`);
            
            // Sembunyikan skeleton, tampilkan canvas
            chartSkeleton.classList.add("hidden");
            chartContext.canvas.style.display = 'block';

            mainChartInstance = new Chart(chartContext, {
                type: 'line',
                data: {
                    labels: chartData.labels,
                    datasets: [
                        {
                            label: 'Pemasukan',
                            data: chartData.income_data,
                            borderColor: '#22c55e', // green-500
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            fill: true,
                            tension: 0.3,
                        },
                        {
                            label: 'Pengeluaran',
                            data: chartData.expense_data,
                            borderColor: '#ef4444', // red-500
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            fill: true,
                            tension: 0.3,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                // Format Sumbu Y sebagai mata uang (K, Jt)
                                callback: function(value, index, values) {
                                    if (value >= 1000000) return (value / 1000000) + ' Jt';
                                    if (value >= 1000) return (value / 1000) + ' K';
                                    return value;
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += formatCurrency(context.parsed.y);
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error("Error loading chart data:", error);
            chartSkeleton.innerHTML = `<p class="text-red-500 text-center">Gagal memuat grafik.</p>`;
            chartSkeleton.classList.remove("hidden"); // Tampilkan pesan error
        }
    };

    // --- 4. Event Listeners ---

    // Fungsi untuk me-refresh semua data
    const refreshAllData = () => {
        loadDashboardStats();
        loadDashboardChart();
        // loadTransactions(); // Transaksi terakhir tidak perlu difilter
    };

    // Event listener untuk tombol filter
    filterButtons.forEach(button => {
        button.addEventListener("click", () => {
            // Update state
            currentFilter = button.dataset.filter;
            
            // Update UI tombol
            filterButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            
            // Refresh data
            refreshAllData();
        });
    });

    // Event Listener Logout
    logoutButton.addEventListener("click", () => {
        localStorage.removeItem("goBisnisToken");
        window.location.href = "/";
    });

    // --- 5. Jalankan Semua Fungsi Load Awal ---
    loadProfile();
    loadTransactions(); // Muat transaksi terakhir (tidak tergantung filter)
    refreshAllData(); // Muat statistik + grafik (tergantung filter default)
});