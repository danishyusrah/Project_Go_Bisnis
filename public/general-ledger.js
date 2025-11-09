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
    const { jsPDF } = window.jspdf;

    // [DIUBAH] Ambil elemen-elemen dari HTML
    const dateRangeLabelEl = document.getElementById("dateRangeLabel");
    // [DIHAPUS] const filterButtons = document.querySelectorAll(".filter-button");
    const downloadPdfButton = document.getElementById("downloadPdfButton");
    
    // [BARU] Ambil elemen filter dropdown baru
    const filterMonthEl = document.getElementById("filter-month");
    const filterYearEl = document.getElementById("filter-year");

    // Elemen Ringkasan
    const summarySkeleton = document.getElementById("summary-skeleton");
    const summaryContent = document.getElementById("summary-content");
    const summaryBeginningBalanceEl = document.getElementById("summaryBeginningBalance");
    const summaryTotalCreditEl = document.getElementById("summaryTotalCredit");
    const summaryTotalDebitEl = document.getElementById("summaryTotalDebit");
    const summaryEndingBalanceEl = document.getElementById("summaryEndingBalance");

    // Elemen Tabel
    const tableBodyEl = document.getElementById("ledger-table-body");
    const tableFooterEl = document.getElementById("ledger-table-footer");
    const tableSkeletonRow = document.getElementById("table-skeleton-row");
    const noDataMessageEl = document.getElementById("no-data-message");

    // [DIHAPUS] Variabel state lama
    // let currentFilter = "this-month"; 
    // let currentFilterLabel = "Bulan Ini";
    
    // Variabel state baru
    let currentReportData = null; // Untuk menyimpan data laporan (untuk PDF)
    let userFullName = "Pengguna"; // Untuk nama di PDF

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

    // Fungsi untuk memuat data profil (hanya untuk nama di PDF)
    const loadProfile = async () => {
        try {
            const data = await fetchWithAuth("/api/v1/profile");
            userFullName = data.user.full_name || data.user.username;
        } catch (error) {
            console.error("Error loading profile:", error);
        }
    };

    /**
     * Fungsi utama untuk memuat dan merender laporan buku besar
     */
    const loadLedgerReport = async () => {
        const dateQuery = getDateRangeQuery(); // Dapatkan query string tanggal
        
        // Tampilkan skeleton loader
        summarySkeleton.classList.remove("hidden");
        summaryContent.classList.add("hidden");
        tableSkeletonRow.classList.remove("hidden");
        noDataMessageEl.classList.add("hidden");
        tableBodyEl.innerHTML = ""; // Kosongkan data lama
        tableFooterEl.innerHTML = "";
        currentReportData = null; // Hapus data lama

        try {
            // Panggil API baru kita
            const report = (await fetchWithAuth(`/api/v1/reports/general-ledger${dateQuery}`)) || {};
            currentReportData = report; // Simpan data untuk PDF

            // 1. Render Ringkasan
            summaryBeginningBalanceEl.textContent = formatCurrency(report.beginning_balance);
            summaryTotalCreditEl.textContent = `+ ${formatCurrency(report.total_credit)}`;
            summaryTotalDebitEl.textContent = `- ${formatCurrency(report.total_debit)}`;
            summaryEndingBalanceEl.textContent = formatCurrency(report.ending_balance);
            
            summarySkeleton.classList.add("hidden");
            summaryContent.classList.remove("hidden");

            // 2. Render Tabel
            tableSkeletonRow.classList.add("hidden");

            // Ambil tanggal awal dari filter
            const selectedMonth = parseInt(filterMonthEl.value, 10);
            const selectedYear = parseInt(filterYearEl.value, 10);
            const startDate = new Date(selectedYear, selectedMonth, 1);
            const startDateLabel = startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

            if (report.entries.length === 0) {
                noDataMessageEl.classList.remove("hidden");
                // Tampilkan Saldo Awal saja jika tidak ada entri
                const startBalanceRow = document.createElement("tr");
                startBalanceRow.className = "font-medium bg-gray-50";
                startBalanceRow.innerHTML = `
                    <td>${startDateLabel}</td>
                    <td>Saldo Awal</td>
                    <td class="text-right font-mono">-</td>
                    <td class="text-right font-mono">-</td>
                    <td class="text-right font-mono">${formatCurrency(report.beginning_balance)}</td>
                `;
                tableBodyEl.appendChild(startBalanceRow);
                
                // Render Footer Tabel (Total)
                tableFooterEl.innerHTML = `
                    <tr>
                        <td colspan="2">Total</td>
                        <td class="text-right font-mono text-red-700">${formatCurrency(report.total_debit)}</td>
                        <td class="text-right font-mono text-green-700">${formatCurrency(report.total_credit)}</td>
                        <td class="text-right font-mono">${formatCurrency(report.ending_balance)}</td>
                    </tr>
                `;

                return;
            }

            // Buat baris Saldo Awal
            const startBalanceRow = document.createElement("tr");
            startBalanceRow.className = "font-medium bg-gray-50";
            startBalanceRow.innerHTML = `
                <td>${startDateLabel}</td>
                <td>Saldo Awal</td>
                <td class="text-right font-mono">-</td>
                <td class="text-right font-mono">-</td>
                <td class="text-right font-mono">${formatCurrency(report.beginning_balance)}</td>
            `;
            tableBodyEl.appendChild(startBalanceRow);

            // Render setiap entri transaksi
            report.entries.forEach(entry => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${entry.date}</td>
                    <td>${entry.description}</td>
                    <td class="text-right font-mono ${entry.debit > 0 ? 'text-red-600' : 'text-gray-500'}">
                        ${entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                    </td>
                    <td class="text-right font-mono ${entry.credit > 0 ? 'text-green-600' : 'text-gray-500'}">
                        ${entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                    </td>
                    <td class="text-right font-mono">${formatCurrency(entry.balance)}</td>
                `;
                tableBodyEl.appendChild(row);
            });

            // 3. Render Footer Tabel (Total)
            tableFooterEl.innerHTML = `
                <tr>
                    <td colspan="2">Total</td>
                    <td class="text-right font-mono text-red-700">${formatCurrency(report.total_debit)}</td>
                    <td class="text-right font-mono text-green-700">${formatCurrency(report.total_credit)}</td>
                    <td class="text-right font-mono">${formatCurrency(report.ending_balance)}</td>
                </tr>
            `;

        } catch (error) {
            console.error("Error loading general ledger report:", error);
            tableSkeletonRow.classList.add("hidden");
            tableBodyEl.innerHTML = `<tr><td colspan="5" class="text-red-500 text-center p-10">Gagal memuat laporan: ${error.message}</td></tr>`;
        }
    };

    // --- 5. Fungsi Ekspor PDF (Tabel) ---

    /**
     * Membuat dan mengunduh PDF Tabel menggunakan jsPDF-AutoTable
     */
    const exportToPDF = () => {
        if (!currentReportData) {
            alert("Data laporan belum dimuat. Silakan tunggu atau coba muat ulang.");
            return;
        }

        const report = currentReportData;
        const doc = new jsPDF();
        
        // Ambil label rentang tanggal yang sedang aktif
        const periodLabel = dateRangeLabelEl.textContent;

        // 1. Definisikan Kolom Tabel
        const head = [['Tanggal', 'Keterangan', 'Debet', 'Kredit', 'Saldo']];

        // 2. Definisikan Baris Data (Body)
        const body = [];

        // Ambil tanggal awal dari filter
        const selectedMonth = parseInt(filterMonthEl.value, 10);
        const selectedYear = parseInt(filterYearEl.value, 10);
        const startDate = new Date(selectedYear, selectedMonth, 1);
        const startDateLabel = startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        
        // Tambahkan baris Saldo Awal
        body.push([
            { content: startDateLabel, styles: { fontStyle: 'bold' } },
            { content: 'Saldo Awal', styles: { fontStyle: 'bold' } },
            { content: '-', styles: { halign: 'right', fontStyle: 'bold' } },
            { content: '-', styles: { halign: 'right', fontStyle: 'bold' } },
            { content: formatCurrency(report.beginning_balance), styles: { halign: 'right', fontStyle: 'bold' } }
        ]);

        // Tambahkan baris Transaksi
        report.entries.forEach(entry => {
            body.push([
                entry.date,
                entry.description,
                { content: entry.debit > 0 ? formatCurrency(entry.debit) : '-', styles: { halign: 'right', textColor: [220, 38, 38] } }, // Merah
                { content: entry.credit > 0 ? formatCurrency(entry.credit) : '-', styles: { halign: 'right', textColor: [22, 163, 74] } }, // Hijau
                { content: formatCurrency(entry.balance), styles: { halign: 'right' } }
            ]);
        });

        // 3. Tambahkan Judul Dokumen
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Laporan Buku Besar (Jurnal Kas)', 14, 15);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Periode: ${periodLabel}`, 14, 21); // <-- Menggunakan label yang sudah diformat
        doc.text(`Pemilik: ${userFullName}`, 14, 26);

        // 4. Buat Tabel
        doc.autoTable({
            head: head,
            body: body,
            startY: 30, // Mulai tabel setelah judul
            theme: 'striped',
            headStyles: { fillColor: [67, 56, 202], textColor: 255 }, // Header indigo
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 25 }, // Tanggal
                1: { cellWidth: 75 }, // Keterangan (lebih lebar)
                2: { halign: 'right', cellWidth: 25 }, // Debet
                3: { halign: 'right', cellWidth: 25 }, // Kredit
                4: { halign: 'right', cellWidth: 25 }, // Saldo
            },
            didDrawCell: (data) => {
                // (Logika pewarnaan alternatif, dinonaktifkan karena sudah di-handle di 'body')
            }
        });

        // 5. Tambahkan Ringkasan Total di Bawah Tabel
        const finalY = doc.autoTable.previous.finalY; // Ambil posisi Y terakhir
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Ringkasan Akhir:', 14, finalY + 10);
        
        doc.autoTable({
            body: [
                ['Total Debet (Keluar)', { content: formatCurrency(report.total_debit), styles: { halign: 'right', textColor: [220, 38, 38] } }],
                ['Total Kredit (Masuk)', { content: formatCurrency(report.total_credit), styles: { halign: 'right', textColor: [22, 163, 74] } }],
                ['Saldo Akhir', { content: formatCurrency(report.ending_balance), styles: { halign: 'right', fontStyle: 'bold' } }],
            ],
            startY: finalY + 12,
            theme: 'grid',
            styles: { fontSize: 9 },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });


        // 6. Simpan PDF
        const fileName = `Buku_Besar_${periodLabel.replace(" ", "_")}.pdf`;
        doc.save(fileName);
    };


    // --- 6. Event Listeners ---

    // [DIUBAH] Event listener untuk filter dropdown
    filterMonthEl.addEventListener("change", loadLedgerReport);
    filterYearEl.addEventListener("change", loadLedgerReport);

    // Event listener untuk tombol download PDF
    downloadPdfButton.addEventListener("click", exportToPDF);

    // --- 7. Jalankan Load Awal ---
    loadProfile(); // Muat nama pengguna
    populateYearFilter(); // <-- Panggil fungsi baru
    setDefaultFilters();  // <-- Panggil fungsi baru
    loadLedgerReport(); // Muat data awal (default "Bulan Ini")
});