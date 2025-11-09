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

    // [DIUBAH] Ambil elemen-elemen dari HTML
    const reportListEl = document.getElementById("report-list");
    const dateRangeLabelEl = document.getElementById("dateRangeLabel");
    
    // [BARU] Ambil elemen filter dropdown baru
    const filterMonthEl = document.getElementById("filter-month");
    const filterYearEl = document.getElementById("filter-year");
    // [DIHAPUS] const filterButtons = document.querySelectorAll(".filter-button");

    // Ambil elemen untuk PDF
    const downloadPdfButton = document.getElementById("downloadPdfButton");
    const reportContentEl = document.getElementById("report-content"); // Konten yang akan di-print
    const pdfLoadingOverlay = document.getElementById("pdfLoadingOverlay");

    // [DIHAPUS] Variabel state lama tidak diperlukan lagi
    // let currentFilter = "this-month"; 
    // let currentFilterLabel = "Bulan Ini";

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
        
        if (response.status === 204) {
            return null;
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

        // 6. Format ke RFC3339 (ISO string) yang dimengerti Go
        const fromQuery = `from=${startDate.toISOString()}`;
        const toQuery = `to=${endDate.toISOString()}`;
        
        return `?${fromQuery}&${toQuery}`;
    };

    // --- 4. Memuat Data Laporan ---

    /**
     * Fungsi utama untuk memuat dan merender laporan performa produk
     */
    const loadProductPerformanceReport = async () => {
        const dateQuery = getDateRangeQuery(); // Dapatkan query string tanggal
        
        // Tampilkan skeleton loader
        reportListEl.innerHTML = `
            <div class="p-4 bg-white rounded-xl card-shadow space-y-3">
                <div class="flex justify-between items-center">
                    <div class="skeleton h-5 w-1/2"></div>
                    <div class="skeleton h-4 w-1/4"></div>
                </div>
                <div class="flex justify-between items-center">
                    <div class="skeleton h-6 w-1/3"></div>
                    <div class="skeleton h-4 w-1/3"></div>
                </div>
            </div>`;
        
        try {
            // Panggil API baru kita
            const reports = (await fetchWithAuth(`/api/v1/reports/product-performance${dateQuery}`)) || [];
            
            reportListEl.innerHTML = ""; // Kosongkan loader

            if (reports.length === 0) {
                reportListEl.innerHTML = `<p class="text-gray-500 text-center py-10">Tidak ada produk yang terjual pada periode ini.</p>`;
                return;
            }

            // Render setiap item laporan
            reports.forEach(item => {
                const reportElement = document.createElement("div");
                reportElement.className = "p-4 bg-white rounded-xl card-shadow";
                
                reportElement.innerHTML = `
                    <div class="flex justify-between items-start">
                        <!-- Info Produk -->
                        <div class="flex-1 min-w-0">
                            <p class="text-base font-semibold text-gray-900 truncate">${item.product_name}</p>
                            <p class="text-sm text-gray-500">${item.total_sold} unit terjual</p>
                        </div>
                        <!-- Info Pendapatan -->
                        <div class="flex-shrink-0 ml-4 text-right">
                            <p class="text-lg font-bold text-green-600">${formatCurrency(item.total_revenue)}</p>
                            <p class="text-sm text-gray-500">Pendapatan</p>
                        </div>
                    </div>
                `;
                reportListEl.appendChild(reportElement);
            });

        } catch (error) {
            console.error("Error loading product performance report:", error);
            reportListEl.innerHTML = `<p class="text-red-500 text-center py-10">Gagal memuat laporan: ${error.message}</p>`;
        }
    };

    // --- 5. Fungsi Ekspor PDF ---

    /**
     * Membuat dan mengunduh PDF dari konten laporan
     */
    const exportToPDF = async () => {
        // Tampilkan loading
        pdfLoadingOverlay.classList.remove("hidden");

        try {
            // 1. "Foto" elemen <main> menggunakan html2canvas
            const canvas = await html2canvas(reportContentEl, {
                scale: 2,
                useCORS: true,
                logging: false,
            });

            // 2. Siapkan dokumen PDF (A4, potrait, milimeter)
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // 3. Ambil data gambar dari canvas
            const imgData = canvas.toDataURL('image/png');
            
            // 4. Hitung dimensi agar pas di A4 dengan margin
            const margin = 10; // 10mm margin
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const contentWidth = pdfWidth - (margin * 2);
            // Hitung tinggi gambar dengan rasio yang sama
            const contentHeight = (canvas.height * contentWidth) / canvas.width;

            // 5. Tambahkan Judul dan Tanggal (untuk tampilan elegan)
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(16);
            pdf.text('Laporan Performa Produk', margin, margin + 5);
            
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.text(dateRangeLabelEl.textContent, margin, margin + 12); // <-- Mengambil label yang sudah diupdate
            
            // 6. Tambahkan gambar "foto" ke PDF
            let topPosition = margin + 20;
            let imgHeight = contentHeight;

            if (contentHeight > (pdfHeight - topPosition - margin)) {
                console.warn("Konten laporan terlalu panjang untuk satu halaman PDF.");
                 pdf.addImage(imgData, 'PNG', margin, topPosition, contentWidth, pdfHeight - topPosition - margin);
            } else {
                 pdf.addImage(imgData, 'PNG', margin, topPosition, contentWidth, contentHeight);
            }

            // 7. Buat nama file
            const fileName = `Laporan_Performa_Produk_${dateRangeLabelEl.textContent.replace(" ", "_")}.pdf`;

            // 8. Unduh PDF
            pdf.save(fileName);

        } catch (error) {
            console.error("Gagal membuat PDF:", error);
            alert("Maaf, terjadi kesalahan saat membuat file PDF.");
        } finally {
            // Sembunyikan loading, apa pun yang terjadi
            pdfLoadingOverlay.classList.add("hidden");
        }
    };


    // --- 6. Event Listeners ---

    // [DIUBAH] Event listener untuk filter dropdown
    filterMonthEl.addEventListener("change", loadProductPerformanceReport);
    filterYearEl.addEventListener("change", loadProductPerformanceReport);


    // Event listener untuk tombol download PDF
    downloadPdfButton.addEventListener("click", exportToPDF);

    // --- 7. Jalankan Load Awal ---
    populateYearFilter(); // <-- Panggil fungsi baru
    setDefaultFilters();  // <-- Panggil fungsi baru
    loadProductPerformanceReport(); // Muat data awal (default "Bulan Ini")
});