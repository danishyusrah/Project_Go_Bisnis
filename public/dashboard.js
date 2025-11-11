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

    // Inisialisasi library PDF
    const { jsPDF } = jspdf;

    // [DIUBAH] Ambil elemen-elemen dari HTML dengan ID baru
    const userFullNameEl = document.getElementById("userFullName");
    const netProfitEl = document.getElementById("netProfit");
    const netProfitLabelEl = document.getElementById("netProfitLabel"); // Label Laba Bersih
    const totalRevenueEl = document.getElementById("totalRevenue");
    const totalExpenseEl = document.getElementById("totalExpense");
    const dateRangeLabelEl = document.getElementById("dateRangeLabel"); // Label rentang tanggal
    const revenueLabelEl = document.getElementById("revenueLabel");
    const expenseLabelEl = document.getElementById("expenseLabel");
    const transactionListEl = document.getElementById("transactionList");
    const logoutButton = document.getElementById("logoutButton");

    // --- [PERBAIKAN] ---
    // Menambahkan elemen Laba Kotor (Gross Profit) dan Modal (COGS)
    const grossProfitEl = document.getElementById("grossProfit");
    const totalCOGSEl = document.getElementById("totalCOGS");
    const grossProfitLabelEl = document.getElementById("grossProfitLabel");
    const cogsLabelEl = document.getElementById("cogsLabel");
    // --- [AKHIR PERBAIKAN] ---
    
    // [DIUBAH] Ambil elemen filter dropdown baru
    const filterMonthEl = document.getElementById("filter-month");
    const filterYearEl = document.getElementById("filter-year");
    
    // Ambil elemen Grafik
    const chartContext = document.getElementById("mainChart").getContext("2d");
    const chartSkeleton = document.getElementById("chartSkeleton");
    let mainChartInstance = null; // Untuk menyimpan instance Chart

    // Ambil elemen untuk PDF
    const downloadPdfButton = document.getElementById("downloadPdfButton");
    const dashboardContentEl = document.getElementById("dashboard-content");
    const pdfLoadingOverlay = document.getElementById("pdfLoadingOverlay");

    // --- [BARU UNTUK FITUR STOK MINIMUM] ---
    const lowStockAlertSection = document.getElementById("low-stock-alert-section");
    const lowStockListEl = document.getElementById("low-stock-list");
    // --- [AKHIR BARU] ---


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


    // --- [BARU] 3. Logika Filter Tanggal ---

    /**
     * [BARU] Mengisi dropdown tahun dari tahun ini s/d 5 tahun ke belakang
     */
    const populateYearFilter = () => {
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < 5; i++) {
            const year = currentYear - i;
            const option = document.createElement("option");
            option.value = year;
            option.textContent = year;
            filterYearEl.appendChild(option);
        }
    };

    /**
     * [BARU] Mengatur filter ke bulan dan tahun saat ini
     */
    const setDefaultFilters = () => {
        const now = new Date();
        const currentMonth = now.getMonth(); // 0 = Januari, 1 = Februari, ...
        const currentYear = now.getFullYear();
        
        filterMonthEl.value = currentMonth;
        filterYearEl.value = currentYear;
    };

    /**
     * [DIUBAH TOTAL] Helper untuk menghitung rentang tanggal dari dropdown
     * @returns {string} - Query string (misal: "?from=...&to=...")
     */
    const getDateRangeQuery = () => {
        // 1. Ambil nilai dari dropdown
        const selectedMonth = parseInt(filterMonthEl.value, 10); // 0-11
        const selectedYear = parseInt(filterYearEl.value, 10);

        // 2. Buat objek Date untuk label
        const dateForLabel = new Date(selectedYear, selectedMonth, 1);
        const filterLabel = dateForLabel.toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric"
        });

        // 3. Hitung tanggal mulai (Awal bulan)
        const startDate = new Date(selectedYear, selectedMonth, 1);
        startDate.setHours(0, 0, 0, 0);

        // 4. Hitung tanggal akhir (Akhir bulan)
        // Trik: ambil hari ke-0 dari bulan BERIKUTNYA
        const endDate = new Date(selectedYear, selectedMonth + 1, 0); 
        endDate.setHours(23, 59, 59, 999);

        // 5. Update label di UI
        dateRangeLabelEl.textContent = filterLabel;
        netProfitLabelEl.textContent = `Laba Bersih (${filterLabel})`;
        revenueLabelEl.textContent = filterLabel;
        expenseLabelEl.textContent = filterLabel;
        // --- [PERBAIKAN] ---
        // Update label untuk Laba Kotor dan COGS
        grossProfitLabelEl.textContent = filterLabel;
        cogsLabelEl.textContent = filterLabel;
        // --- [AKHIR PERBAIKAN] ---

        // 6. Format ke RFC3339 (ISO string) yang dimengerti Go
        const fromQuery = `from=${startDate.toISOString()}`;
        const toQuery = `to=${endDate.toISOString()}`;
        
        return `?${fromQuery}&${toQuery}`;
    };

    // --- 4. Memuat Data dari API ---

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

    // [DIUBAH] Fungsi untuk memuat statistik dashboard
    const loadDashboardStats = async () => {
        const dateQuery = getDateRangeQuery(); // Dapatkan query string tanggal
        
        try {
            // Membaca data JSON baru dari API
            const stats = await fetchWithAuth(`/api/v1/dashboard/stats${dateQuery}`);
            
            // Isi data ke elemen HTML
            netProfitEl.textContent = formatCurrency(stats.net_profit);       // Laba Bersih
            totalRevenueEl.textContent = formatCurrency(stats.total_revenue); // Pendapatan Kotor
            totalExpenseEl.textContent = formatCurrency(stats.total_expense); // Biaya Operasional
            
            // --- [PERBAIKAN] ---
            // Menampilkan data Laba Kotor dan COGS ke HTML
            grossProfitEl.textContent = formatCurrency(stats.gross_profit); // <-- BARU
            totalCOGSEl.textContent = formatCurrency(stats.total_cogs);     // <-- BARU
            // --- [AKHIR PERBAIKAN] ---
            
            // Label sudah di-update oleh getDateRangeQuery()

        } catch (error) {
            console.error("Error loading dashboard stats:", error);
            netProfitEl.textContent = "Error";
            totalRevenueEl.textContent = "Error";
            totalExpenseEl.textContent = "Error";
            // --- [PERBAIKAN] ---
            grossProfitEl.textContent = "Error"; // <-- BARU
            totalCOGSEl.textContent = "Error";     // <-- BARU
            // --- [AKHIR PERBAIKAN] ---
        }
    };

    // [DIUBAH] Fungsi untuk memuat transaksi terakhir
    const loadTransactions = async () => {
        try {
            const transactions = await fetchWithAuth("/api/v1/transactions"); // Ini selalu 5 terbaru

            transactionListEl.innerHTML = ""; // Kosongkan placeholder loading

            if (!transactions || transactions.length === 0) {
                transactionListEl.innerHTML = `<p class="text-gray-500 text-center">Belum ada transaksi.</p>`;
                return;
            }

            // Batasi hanya 5 transaksi terbaru untuk dashboard
            transactions.slice(0, 5).forEach(tx => {
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
                    month: "short"
                });

                const customerName = tx.customer_name || "Umum"; 

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
                    <div class="flex-1 ml-4 min-w-0"> <!-- [DIUBAH] Ditambahkan min-w-0 -->
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
            console.error("Error loading transactions:", error);
            transactionListEl.innerHTML = `<p class="text-red-500 text-center">Gagal memuat transaksi.</p>`;
        }
    };

    /**
     * [DIUBAH] Fungsi untuk memuat dan menggambar grafik
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
            // Membaca data JSON baru dari API
            const chartData = await fetchWithAuth(`/api/v1/dashboard/chart${dateQuery}`);
            
            // Sembunyikan skeleton, tampilkan canvas
            chartSkeleton.classList.add("hidden");
            chartContext.canvas.style.display = 'block';

            mainChartInstance = new Chart(chartContext, {
                type: 'line',
                data: {
                    labels: chartData.labels,
                    // Dataset diganti menjadi 3 garis
                    datasets: [
                        {
                            label: 'Pendapatan Kotor',
                            data: chartData.revenue_data, // <-- Data Baru
                            borderColor: '#22c55e', // green-500
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            fill: true,
                            tension: 0.3,
                        },
                        {
                            label: 'Laba Kotor',
                            data: chartData.gross_profit_data, // <-- Data Baru
                            borderColor: '#3b82f6', // blue-500
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            fill: true,
                            tension: 0.3,
                        },
                        {
                            label: 'Biaya Operasional',
                            data: chartData.expense_data, // <-- Nama label baru
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
                    animation: true, // Biarkan true, kita akan nonaktifkan saat print
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


    // --- [BARU UNTUK FITUR STOK MINIMUM] ---
    /**
     * Memuat daftar produk yang stoknya menipis
     */
    const loadLowStockAlerts = async () => {
        try {
            const products = await fetchWithAuth("/api/v1/dashboard/low-stock");
            
            // Jika tidak ada produk, sembunyikan seluruh bagian
            if (!products || products.length === 0) {
                lowStockAlertSection.classList.add("hidden");
                return;
            }

            // Jika ada, tampilkan bagian dan bersihkan skeleton
            lowStockAlertSection.classList.remove("hidden");
            lowStockListEl.innerHTML = ""; // Hapus skeleton

            products.forEach(product => {
                const alertElement = document.createElement("a");
                alertElement.className = "flex items-center justify-between p-4 bg-white rounded-xl card-shadow hover:bg-gray-50 transition-colors cursor-pointer";
                // Tautkan ke halaman edit produk
                alertElement.href = `/edit-product.html?id=${product.product_id}`; 

                alertElement.innerHTML = `
                    <div class="flex items-center min-w-0">
                        <div class="p-2.5 bg-yellow-100 rounded-lg flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle text-yellow-600">
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
                            </svg>
                        </div>
                        <div class="flex-1 ml-4 min-w-0">
                            <p class="text-base font-medium text-gray-900 truncate">${product.name}</p>
                            <p class="text-xs text-gray-500 mt-0.5">Sisa: ${product.stock} (Batas: ${product.batas_stok_minimum})</p>
                        </div>
                    </div>
                    <span class="text-sm font-semibold text-gray-700 flex-shrink-0 ml-2">
                        Restock
                    </span>
                `;
                lowStockListEl.appendChild(alertElement);
            });

        } catch (error) {
            console.error("Error loading low stock alerts:", error);
            // Sembunyikan jika error
            lowStockAlertSection.classList.add("hidden");
        }
    };
    // --- [AKHIR BARU] ---


    // --- 6. Fungsi Ekspor PDF ---

    /**
     * Membuat dan mengunduh PDF dari konten dashboard
     */
    const exportToPDF = async () => {
        // Tampilkan loading
        pdfLoadingOverlay.classList.remove("hidden");

        // [PENTING] Nonaktifkan animasi grafik agar "foto" tidak buram/kosong
        if (mainChartInstance) {
            mainChartInstance.options.animation = false;
            mainChartInstance.update('none'); // Update instan tanpa animasi
        }

        try {
            // 1. "Foto" elemen <main>
            const canvas = await html2canvas(dashboardContentEl, {
                scale: 2, // Resolusi tinggi
                useCORS: true,
                logging: false,
            });

            // 2. Siapkan dokumen PDF
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // 3. Ambil data gambar
            const imgData = canvas.toDataURL('image/png');
            
            // 4. Hitung dimensi
            const margin = 10;
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const contentWidth = pdfWidth - (margin * 2);
            const contentHeight = (canvas.height * contentWidth) / canvas.width;

            // 5. Tambahkan Judul Elegan
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(16);
            pdf.text(`Laporan Dashboard - ${userFullNameEl.textContent || 'Go Bisnis'}`, margin, margin + 5);
            
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.text(`Periode: ${dateRangeLabelEl.textContent}`, margin, margin + 12);
            
            // 6. Tambahkan gambar
            let topPosition = margin + 20;
            let imgHeight = contentHeight;

            // Jika konten lebih panjang dari 1 halaman A4, pangkas
            if (contentHeight > (pdfHeight - topPosition - margin)) {
                imgHeight = pdfHeight - topPosition - margin;
                console.warn("Konten dashboard terlalu panjang, memotong PDF.");
            }

            pdf.addImage(imgData, 'PNG', margin, topPosition, contentWidth, imgHeight);

            // 7. Nama file
            const fileName = `Laporan_Dashboard_${dateRangeLabelEl.textContent.replace(" ", "_")}.pdf`;

            // 8. Unduh
            pdf.save(fileName);

        } catch (error) {
            console.error("Gagal membuat PDF:", error);
            alert("Maaf, terjadi kesalahan saat membuat file PDF.");
        } finally {
            // Sembunyikan loading
            pdfLoadingOverlay.classList.add("hidden");
            // [PENTING] Kembalikan animasi grafik
            if (mainChartInstance) {
                mainChartInstance.options.animation = true;
            }
        }
    };

    // --- 7. Event Listeners ---

    // Fungsi untuk me-refresh semua data
    const refreshAllData = () => {
        loadDashboardStats();
        loadDashboardChart();
        // loadTransactions(); // Transaksi terakhir tidak perlu difilter tanggal
    };

    // [DIUBAH] Event listener untuk filter dropdown
    filterMonthEl.addEventListener("change", refreshAllData);
    filterYearEl.addEventListener("change", refreshAllData);

    // Event Listener Logout
    logoutButton.addEventListener("click", () => {
        localStorage.removeItem("goBisnisToken");
        window.location.href = "/";
    });

    // Event listener untuk tombol download PDF
    downloadPdfButton.addEventListener("click", exportToPDF);

    // --- 8. Jalankan Semua Fungsi Load Awal ---
    loadProfile();
    loadTransactions(); // Muat transaksi terakhir (tidak tergantung filter)
    // --- [BARU] ---
    loadLowStockAlerts(); // Muat peringatan stok (tidak tergantung filter)
    // --- [AKHIR BARU] ---
    populateYearFilter(); // <-- Panggil fungsi baru
    setDefaultFilters();  // <-- Panggil fungsi baru
    refreshAllData();     // <-- Panggil ini TERAKHIR untuk memuat data bulan ini
});