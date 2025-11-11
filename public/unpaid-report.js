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
    const summarySkeleton = document.getElementById("summary-skeleton");
    const receivableCard = document.getElementById("receivable-card");
    const payableCard = document.getElementById("payable-card");
    const totalReceivableEl = document.getElementById("totalReceivable");
    const totalPayableEl = document.getElementById("totalPayable");
    const receivablesListEl = document.getElementById("receivables-list");
    const payablesListEl = document.getElementById("payables-list");

    // [BARU] Ambil elemen Toast
    const toastNotification = document.getElementById("toast-notification");
    const toastMessage = document.getElementById("toast-message");
    let toastTimer; // Timer untuk toast

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
        
        // [DIUBAH] Tangani respons non-OK dengan lebih baik
        if (!response.ok) {
            // Coba baca JSON error, jika gagal, gunakan status text
            let errorMsg = response.statusText;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                // Biarkan errorMsg tetap response.statusText
            }
            throw new Error(errorMsg);
        }

        // Tangani respons 204 (No Content) atau 200 OK dari PUT/DELETE
        if (response.status === 204) {
            return null;
        }
         // Untuk PUT /mark-paid yang mengembalikan 200 OK
        try {
            return await response.json();
        } catch (e) {
            return { success: true }; // Jika body kosong tapi 200 OK
        }
    };

    /**
     * [BARU] Helper untuk menampilkan notifikasi (toast)
     * @param {string} message - Pesan yang ingin ditampilkan
     * @param {boolean} isSuccess - true untuk hijau (sukses), false untuk merah (error)
     */
    const showToast = (message, isSuccess = true) => {
        clearTimeout(toastTimer); // Hapus timer sebelumnya jika ada

        toastMessage.textContent = message;
        
        // Atur kelas untuk menampilkan dan memberi warna
        toastNotification.className = 'fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg transition-transform transform translate-y-0';
        if (isSuccess) {
            toastNotification.classList.add('bg-green-600', 'text-white');
            toastNotification.classList.remove('bg-red-600');
        } else {
            toastNotification.classList.add('bg-red-600', 'text-white');
            toastNotification.classList.remove('bg-green-600');
        }
        
        // Sembunyikan toast setelah 3 detik
        toastTimer = setTimeout(() => {
            toastNotification.className = toastNotification.className.replace('translate-y-0', 'translate-y-20');
            // Tambahkan 'hidden' setelah transisi selesai
            setTimeout(() => toastNotification.classList.add('hidden'), 300);
        }, 3000);
    };


    /**
     * [DIUBAH] Helper untuk merender daftar utang atau piutang
     */
    const renderUnpaidList = (listElement, items, type) => {
        listElement.innerHTML = "";
        
        const amountClass = type === 'piutang' ? 'text-green-600' : 'text-red-600';
        const emptyMessage = type === 'piutang' 
            ? "Bagus! Tidak ada piutang yang belum dibayar." 
            : "Bagus! Tidak ada utang yang belum dibayar.";

        if (items.length === 0) {
            listElement.innerHTML = `<p class="text-gray-500 text-center p-5">${emptyMessage}</p>`;
            return;
        }

        items.forEach(item => {
            // Logika Badge Status (Jatuh Tempo)
            let badgeHtml = '';
            if (item.is_overdue) {
                badgeHtml = `<span class="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">LEWAT JATUH TEMPO</span>`;
            } else if (item.due_date) {
                const dueDate = new Date(item.due_date + 'T00:00:00'); 
                const formattedDate = dueDate.toLocaleDateString("id-ID", { day: 'numeric', month: 'short' });
                badgeHtml = `<span class="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">Jatuh Tempo: ${formattedDate}</span>`;
            }

            const itemElement = document.createElement("div");
            itemElement.className = "p-4 bg-white rounded-xl card-shadow";
            // [PERBAIKAN DI SINI] Gunakan 'transaction_id' (huruf kecil)
            itemElement.setAttribute('data-transaction-id', item.transaction_id);

            itemElement.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex-1 min-w-0">
                        <p class="text-base font-semibold text-gray-900 truncate">${item.primary_item}</p>
                        <p class="text-sm text-gray-500 truncate">${item.customer_name}</p>
                        <p class="text-xs text-gray-500 mt-1">${item.created_at}</p>
                    </div>
                    <!-- [DIUBAH] Tambahkan tombol "Tandai Lunas" -->
                    <div class="text-right flex-shrink-0 ml-2 flex items-center space-x-2">
                        <p class="text-lg font-bold ${amountClass}">${formatCurrency(item.amount)}</p>
                        <!-- [PERBAIKAN DI SINI] Gunakan 'transaction_id' (huruf kecil) -->
                        <button title="Tandai Lunas" data-id="${item.transaction_id}" class="mark-paid-button p-2 text-green-500 hover:bg-green-100 rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check pointer-events-none"><path d="M20 6 9 17l-5-5"/></svg>
                        </button>
                    </div>
                </div>
                ${badgeHtml ? `<div class="mt-2 flex flex-wrap gap-1">${badgeHtml}</div>` : ''}
            `;
            
            listElement.appendChild(itemElement);
        });
    };

    /**
     * Fungsi utama untuk memuat laporan
     */
    const loadUnpaidReport = async () => {
        try {
            const report = await fetchWithAuth("/api/v1/reports/unpaid");

            totalReceivableEl.textContent = formatCurrency(report.total_receivable);
            totalPayableEl.textContent = formatCurrency(report.total_payable);

            summarySkeleton.classList.add("hidden");
            receivableCard.classList.remove("hidden");
            payableCard.classList.remove("hidden");

            renderUnpaidList(receivablesListEl, report.receivables, 'piutang');
            renderUnpaidList(payablesListEl, report.payables, 'utang');

        } catch (error) {
            console.error("Error loading unpaid report:", error);
            summarySkeleton.innerHTML = `<p class="text-red-500 text-center col-span-2">Gagal memuat laporan: ${error.message}</p>`;
            receivablesListEl.innerHTML = `<p class="text-red-500 text-center p-5">Gagal memuat daftar.</p>`;
            payablesListEl.innerHTML = `<p class="text-red-500 text-center p-5">Gagal memuat daftar.</p>`;
        }
    };

    // --- [BARU] Logika untuk Menandai Lunas ---

    /**
     * @param {Event} e - Event klik
     */
    const handleMarkPaid = async (e) => {
        const button = e.target.closest('.mark-paid-button');
        if (!button) return; // Klik bukan di tombol

        const transactionID = button.dataset.id;
        
        if (!confirm("Apakah Anda yakin ingin menandai transaksi ini sebagai LUNAS?")) {
            return;
        }

        // Tampilkan loading spinner di tombol
        button.disabled = true;
        button.innerHTML = `<svg class="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;

        try {
            // Panggil API baru
            await fetchWithAuth(`/api/v1/transactions/${transactionID}/mark-paid`, {
                method: "PUT"
            });
            
            showToast("Transaksi berhasil dilunasi!", true);
            
            // Animasi menghilang
            const card = button.closest(`[data-transaction-id="${transactionID}"]`);
            if (card) {
                card.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out, max-height 0.3s ease-out';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                card.style.maxHeight = '0px';
                card.style.padding = '0px';
                card.style.margin = '0px';
            }

            // Muat ulang data setelah animasi selesai
            setTimeout(() => {
                loadUnpaidReport();
            }, 300);

        } catch (error) {
            console.error("Gagal menandai lunas:", error);
            showToast(`Gagal: ${error.message}`, false);
            // Kembalikan tombol ke semula
            button.disabled = false;
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check pointer-events-none"><path d="M20 6 9 17l-5-5"/></svg>`;
        }
    };


    // --- 3. Jalankan Fungsi Load Awal & Event Listeners ---

    // [BARU] Tambahkan event listener di parent
    receivablesListEl.addEventListener("click", handleMarkPaid);
    payablesListEl.addEventListener("click", handleMarkPaid);

    loadUnpaidReport();
});