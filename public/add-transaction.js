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

    // Variabel global untuk menyimpan daftar produk yang diambil dari API
    let userProducts = [];

    // Ambil elemen-elemen form
    const transactionForm = document.getElementById("transactionForm");
    const typeIncome = document.getElementById("type_income");
    const typeExpense = document.getElementById("type_expense");
    const customerLabel = document.getElementById("customerLabel");
    const itemList = document.getElementById("item-list");
    const addItemButton = document.getElementById("add-item-button");
    const totalAmountEl = document.getElementById("totalAmount");
    const errorMessageEl = document.getElementById("errorMessage");
    const submitButton = document.getElementById("submitButton");

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

    // --- 3. Logika Form Dinamis ---

    /**
     * Memuat produk milik user dari API
     */
    const loadProducts = async () => {
        try {
            userProducts = await fetchWithAuth("/api/v1/products");
            // Isi dropdown di item pertama
            updateProductDropdowns();
        } catch (error) {
            console.error("Gagal memuat produk:", error);
            // Tetap lanjutkan, user masih bisa input manual
        }
    };

    /**
     * Mengisi <select> produk di semua baris item
     */
    const updateProductDropdowns = () => {
        const selects = document.querySelectorAll(".product-select");
        selects.forEach(select => {
            // Simpan value yang sedang dipilih (jika ada)
            const selectedValue = select.value;
            
            // Kosongkan opsi (kecuali yang default)
            select.innerHTML = `
                <option value="">-- Pilih Produk --</option>
                <option value="other">Lainnya (Nama Kustom)</option>
            `;
            
            // Tambahkan produk dari API
            userProducts.forEach(product => {
                const option = document.createElement("option");
                option.value = product.id;
                option.textContent = `${product.name} (Stok: ${product.stock})`;
                // Set data-price agar bisa auto-fill harga
                option.dataset.price = product.selling_price;
                select.appendChild(option);
            });

            // Set kembali value yang tadi dipilih
            select.value = selectedValue;
        });
    };

    /**
     * Meng-update UI berdasarkan tipe transaksi (INCOME/EXPENSE)
     */
    const updateFormForType = () => {
        const isIncome = typeIncome.checked;
        
        customerLabel.textContent = isIncome ? "Nama Pelanggan" : "Nama Supplier / Toko";
        
        const itemRows = document.querySelectorAll(".item-row");
        itemRows.forEach(row => {
            const productSelect = row.querySelector(".product-select");
            const customNameInput = row.querySelector(".product-name-custom");
            
            if (isIncome) {
                // Tipe PEMASUKAN: Tampilkan dropdown produk
                productSelect.classList.remove("hidden");
                // Cek jika "Lainnya" dipilih
                if (productSelect.value !== "other") {
                    customNameInput.classList.add("hidden");
                }
            } else {
                // Tipe PENGELUARAN: Sembunyikan dropdown, paksa input manual
                productSelect.value = "other"; // Set ke "Lainnya"
                productSelect.classList.add("hidden");
                customNameInput.classList.remove("hidden");
            }
        });
        
        // Update juga dropdown (jika baru di-load)
        if (isIncome) {
            updateProductDropdowns();
        }
    };

    /**
     * Menghitung total harga dari semua item
     */
    const calculateTotal = () => {
        let total = 0;
        const itemRows = document.querySelectorAll(".item-row");
        
        itemRows.forEach(row => {
            const quantity = parseFloat(row.querySelector('input[name="quantity"]').value) || 0;
            const unitPrice = parseFloat(row.querySelector('input[name="unit_price"]').value) || 0;
            total += quantity * unitPrice;
        });
        
        totalAmountEl.textContent = formatCurrency(total);
    };

    /**
     * Menambah baris item baru ke form
     */
    const addNewItemRow = () => {
        const newItemRow = document.createElement("div");
        newItemRow.className = "item-row grid grid-cols-6 gap-2 items-end p-2 border rounded-lg";
        newItemRow.innerHTML = `
            <div class="col-span-6">
                <label class="block text-xs font-medium text-gray-700">Nama Item / Produk</label>
                <select name="product_id" class="product-select mt-1 block w-full text-sm py-2 px-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="">-- Pilih Produk --</option>
                    <option value="other">Lainnya (Nama Kustom)</option> 
                </select>
                <input type="text" name="product_name" class="product-name-custom mt-1 block w-full text-sm py-2 px-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 hidden" placeholder="Nama Item Kustom">
            </div>
            <div class="col-span-2">
                <label class="block text-xs font-medium text-gray-700">Jml</label>
                <input type="number" name="quantity" value="1" min="1" class="item-calc mt-1 block w-full text-sm py-2 px-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Jml">
            </div>
            <div class="col-span-3">
                <label class="block text-xs font-medium text-gray-700">Harga Satuan</label>
                <input type="number" name="unit_price" value="0" min="0" class="item-calc mt-1 block w-full text-sm py-2 px-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Harga">
            </div>
            <div class="col-span-1">
                <button type="button" class="delete-item-button p-2 text-red-500 hover:bg-red-100 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>
                </button>
            </div>
        `;
        
        itemList.appendChild(newItemRow);
        
        // Update dropdown di baris baru
        updateFormForType();
        // Attach event listener ke elemen baru
        attachItemRowListeners(newItemRow);
    };

    /**
     * Menghapus baris item
     */
    const deleteItemRow = (button) => {
        const row = button.closest(".item-row");
        row.remove();
        calculateTotal();
    };

    /**
     * Meng-handle perubahan pada dropdown produk
     */
    const handleProductSelectChange = (select) => {
        const row = select.closest(".item-row");
        const customNameInput = row.querySelector(".product-name-custom");
        const unitPriceInput = row.querySelector('input[name="unit_price"]');
        
        if (select.value === "other") {
            // Tampilkan input nama kustom
            customNameInput.classList.remove("hidden");
            customNameInput.value = "";
            unitPriceInput.value = 0;
        } else if (select.value === "") {
            // Pilihan default "-- Pilih Produk --"
            customNameInput.classList.add("hidden");
            unitPriceInput.value = 0;
        } else {
            // Produk dari API dipilih
            customNameInput.classList.add("hidden");
            // Auto-fill harga
            const selectedOption = select.options[select.selectedIndex];
            unitPriceInput.value = selectedOption.dataset.price || 0;
            // Auto-fill nama (untuk dikirim ke API)
            customNameInput.value = selectedOption.textContent.split(' (Stok:')[0];
        }
        calculateTotal();
    };

    // --- 4. Event Listeners ---

    /**
     * Menambahkan event listener ke semua input dinamis
     * Menggunakan event delegation agar efisien
     */
    const attachItemRowListeners = (row) => {
        // Hapus item
        const deleteButton = row.querySelector(".delete-item-button");
        if (deleteButton) {
            deleteButton.addEventListener("click", () => deleteItemRow(deleteButton));
        }
        
        // Kalkulasi total
        row.querySelectorAll(".item-calc").forEach(input => {
            input.addEventListener("input", calculateTotal);
        });

        // Perubahan dropdown produk
        const productSelect = row.querySelector(".product-select");
        if (productSelect) {
            productSelect.addEventListener("change", () => handleProductSelectChange(productSelect));
        }
    };

    // Listener untuk toggle Pemasukan/Pengeluaran
    typeIncome.addEventListener("change", updateFormForType);
    typeExpense.addEventListener("change", updateFormForType);

    // Listener untuk tombol "Tambah Item"
    addItemButton.addEventListener("click", addNewItemRow);

    // Attach listener ke baris item pertama yang sudah ada
    attachItemRowListeners(document.querySelector(".item-row"));

    // Listener untuk Form Submit
    transactionForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        
        submitButton.disabled = true;
        submitButton.textContent = "Menyimpan...";
        errorMessageEl.classList.add("hidden");

        try {
            // Kumpulkan data dari form
            const formData = new FormData(transactionForm);
            const type = formData.get("type");
            const customer = formData.get("customer");
            const notes = formData.get("notes");
            
            const items = [];
            const itemRows = document.querySelectorAll(".item-row");
            
            for (const row of itemRows) {
                const productSelect = row.querySelector(".product-select");
                const customNameInput = row.querySelector(".product-name-custom");
                
                let productId = null;
                if (productSelect.value && productSelect.value !== "other") {
                    productId = parseInt(productSelect.value, 10);
                }
                
                const productName = customNameInput.value;
                const quantity = parseInt(row.querySelector('input[name="quantity"]').value, 10);
                const unitPrice = parseFloat(row.querySelector('input[name="unit_price"]').value);

                if (!productName || quantity <= 0 || unitPrice < 0) {
                    throw new Error("Data item tidak valid. Pastikan semua nama, jumlah, dan harga terisi dengan benar.");
                }

                items.push({
                    product_id: productId,
                    product_name: productName,
                    quantity: quantity,
                    unit_price: unitPrice,
                });
            }

            if (items.length === 0) {
                throw new Error("Transaksi harus memiliki minimal 1 item.");
            }

            // Buat payload DTO
            const payload = {
                type: type,
                customer: customer,
                notes: notes,
                items: items,
            };
            
            // Kirim ke API
            await fetchWithAuth("/api/v1/transactions", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            // Berhasil! Arahkan kembali ke dashboard
            window.location.href = "/dashboard.html";

        } catch (error) {
            // Gagal
            errorMessageEl.textContent = error.message;
            errorMessageEl.classList.remove("hidden");
            submitButton.disabled = false;
            submitButton.textContent = "Simpan Transaksi";
        }
    });

    // --- 5. Inisialisasi Halaman ---
    
    // Muat daftar produk saat halaman dibuka
    loadProducts();
    
    // Set form ke status default (Pemasukan)
    updateFormForType();
    
    // Hitung total (awal)
    calculateTotal();
});