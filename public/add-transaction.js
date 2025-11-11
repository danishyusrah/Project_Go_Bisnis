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

    // Variabel global untuk menyimpan daftar
    let userProducts = [];
    let userCustomers = [];
    let userCategories = []; // <-- [BARU] Untuk Kategori

    // Ambil elemen-elemen form
    const transactionForm = document.getElementById("transactionForm");
    
    // [DIUBAH] Ambil semua elemen UI yang akan di-toggle
    const typeIncome = document.getElementById("type_income");
    const typeExpense = document.getElementById("type_expense");
    const typeCapital = document.getElementById("type_capital"); 

    const customerGroup = document.getElementById("customer-group");
    const customerLabel = document.getElementById("customerLabel");
    const customerSelectEl = document.getElementById("customer_id"); 
    
    const capitalAmountGroup = document.getElementById("capital-amount-group");
    const capitalAmountInput = document.getElementById("capital_amount");
    
    // --- [BARU] Ambil elemen Kategori ---
    const categoryGroup = document.getElementById("category-group");
    const categorySelectEl = document.getElementById("category_id");
    // --- [AKHIR BARU] ---

    // --- [BARU] Ambil elemen Utang/Piutang ---
    const paymentStatusGroup = document.getElementById("payment-status-group");
    const paymentStatusSelect = document.getElementById("payment_status");
    const dueDateGroup = document.getElementById("due-date-group");
    // --- [AKHIR BARU] ---

    const notesGroup = document.getElementById("notes-group");

    const itemSection = document.getElementById("item-section");
    const itemList = document.getElementById("item-list");
    const addItemButton = document.getElementById("add-item-button");
    
    const itemTotalGroup = document.getElementById("item-total-group");
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
        // Handle 204 No Content (untuk DELETE)
        if (response.status === 204) {
            return null;
        }
        return response.json();
    };

    // --- 3. Logika Memuat Data Awal (Loaders) ---

    /**
     * Memuat produk milik user dari API
     */
    const loadProducts = async () => {
        try {
            userProducts = (await fetchWithAuth("/api/v1/products")) || [];
            // [DIHAPUS] updateProductDropdowns(); // Pindah ke initializePage
        } catch (error) {
            console.error("Gagal memuat produk:", error);
        }
    };

    /**
     * Memuat pelanggan milik user dari API
     */
    const loadCustomers = async () => {
        try {
            userCustomers = (await fetchWithAuth("/api/v1/customers")) || [];
            // [DIHAPUS] updateCustomerDropdown(); // Pindah ke initializePage
        } catch (error) {
            console.error("Gagal memuat pelanggan:", error);
        }
    };

    /**
     * [BARU] Memuat kategori milik user dari API
     */
    const loadCategories = async () => {
        try {
            userCategories = (await fetchWithAuth("/api/v1/categories")) || [];
        } catch (error) {
            console.error("Gagal memuat kategori:", error);
        }
    };


    // --- 4. Logika Form Dinamis (Renderers) ---

    /**
     * Mengisi <select> produk di semua baris item
     */
    const updateProductDropdowns = () => {
        const selects = document.querySelectorAll(".product-select");
        selects.forEach(select => {
            const selectedValue = select.value;
            select.innerHTML = `
                <option value="">-- Pilih Produk --</option>
                <option value="other">Lainnya (Nama Kustom)</option>
            `;
            
            (userProducts || []).forEach(product => {
                const option = document.createElement("option");
                option.value = product.id;
                option.textContent = `${product.name} (Stok: ${product.stock})`;
                option.dataset.price = product.selling_price;
                select.appendChild(option);
            });
            select.value = selectedValue;
        });
    };

    /**
     * Mengisi <select> pelanggan
     */
    const updateCustomerDropdown = () => {
        if (!customerSelectEl) return;
        
        const selectedValue = customerSelectEl.value;
        customerSelectEl.innerHTML = `<option value="">-- Umum (Tanpa Pelanggan) --</option>`;
        
        (userCustomers || []).forEach(customer => {
            const option = document.createElement("option");
            option.value = customer.id;
            let customerText = customer.name;
            if (customer.phone) {
                customerText += ` (${customer.phone})`;
            }
            option.textContent = customerText;
            customerSelectEl.appendChild(option);
        });

        customerSelectEl.value = selectedValue;
    };

    /**
     * [BARU] Mengisi <select> kategori berdasarkan Tipe Transaksi
     */
    const updateCategoryDropdown = (transactionType) => {
        if (!categorySelectEl) return;
        
        const selectedValue = categorySelectEl.value;
        categorySelectEl.innerHTML = `<option value="">-- Pilih Kategori --</option>`;
        
        // Filter kategori yang sesuai (INCOME atau EXPENSE)
        const filteredCategories = (userCategories || []).filter(cat => cat.type === transactionType);
        
        if (filteredCategories.length === 0) {
             categorySelectEl.innerHTML = `<option value="" disabled>-- Buat Kategori di Pengaturan --</option>`;
        }

        filteredCategories.forEach(cat => {
            const option = document.createElement("option");
            option.value = cat.id;
            option.textContent = cat.name;
            categorySelectEl.appendChild(option);
        });

        categorySelectEl.value = selectedValue;
    };


    /**
     * [DIUBAH TOTAL] Meng-update UI berdasarkan tipe transaksi (INCOME/EXPENSE/CAPITAL)
     */
    const updateFormForType = () => {
        const isIncome = typeIncome.checked;
        const isExpense = typeExpense.checked;
        const isCapital = typeCapital.checked;

        const notesLabel = notesGroup.querySelector("label");

        if (isCapital) {
            // --- TAMPILAN UNTUK MODAL ---
            customerGroup.classList.add("hidden");
            itemSection.classList.add("hidden");
            itemTotalGroup.classList.add("hidden");
            paymentStatusGroup.classList.add("hidden"); // [BARU]
            dueDateGroup.classList.add("hidden");       // [BARU]
            categoryGroup.classList.add("hidden");      // [BARU]

            capitalAmountGroup.classList.remove("hidden");
            notesLabel.textContent = "Catatan (Cth: Modal awal buka warung)";
            submitButton.textContent = "Simpan Setoran Modal";

        } else {
            // --- TAMPILAN UNTUK PEMASUKAN / PENGELUARAN ---
            customerGroup.classList.remove("hidden");
            itemSection.classList.remove("hidden");
            itemTotalGroup.classList.remove("hidden");
            paymentStatusGroup.classList.remove("hidden"); // [BARU]
            categoryGroup.classList.remove("hidden");      // [BARU]
            
            capitalAmountGroup.classList.add("hidden");
            capitalAmountInput.value = 0; // Reset nilai modal
            
            // [BARU] Perbarui dropdown pelanggan & kategori berdasarkan data yang sudah di-load
            updateCustomerDropdown(); 
            updateCategoryDropdown(isIncome ? "INCOME" : "EXPENSE");

            // [BARU] Tampilkan/sembunyikan Tgl Jatuh Tempo
            handlePaymentStatusChange();
            
            customerLabel.textContent = isIncome ? "Nama Pelanggan" : "Nama Supplier / Toko";
            notesLabel.textContent = "Catatan (Opsional)";
            submitButton.textContent = "Simpan Transaksi";

            // Logika dropdown item (sama seperti sebelumnya)
            const itemRows = document.querySelectorAll(".item-row");
            itemRows.forEach(row => {
                const productSelect = row.querySelector(".product-select");
                const customNameInput = row.querySelector(".product-name-custom");
                
                if (isIncome) {
                    productSelect.classList.remove("hidden");
                    if (productSelect.value !== "other") {
                        customNameInput.classList.add("hidden");
                    }
                } else {
                    productSelect.value = "other";
                    productSelect.classList.add("hidden");
                    customNameInput.classList.remove("hidden");
                    customNameInput.value = "";
                }
            });
            
            if (isIncome) {
                updateProductDropdowns(); // Perbarui dropdown produk
            }
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
        
        updateFormForType();
        attachItemRowListeners(newItemRow);
    };

    /**
     * Menghapus baris item
     */
    const deleteItemRow = (button) => {
        // Jangan hapus baris terakhir
        if (document.querySelectorAll(".item-row").length <= 1) {
            return;
        }
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
            customNameInput.classList.remove("hidden");
            customNameInput.value = "";
            unitPriceInput.value = 0;
        } else if (select.value === "") {
            customNameInput.classList.add("hidden");
            unitPriceInput.value = 0;
        } else {
            customNameInput.classList.add("hidden");
            const selectedOption = select.options[select.selectedIndex];
            unitPriceInput.value = selectedOption.dataset.price || 0;
            customNameInput.value = selectedOption.textContent.split(' (Stok:')[0];
        }
        calculateTotal();
    };

    /**
     * [BARU] Menampilkan/menyembunyikan Tgl Jatuh Tempo
     */
    const handlePaymentStatusChange = () => {
        if (paymentStatusSelect.value === 'BELUM LUNAS') {
            dueDateGroup.classList.remove("hidden");
        } else {
            dueDateGroup.classList.add("hidden");
        }
    };


    // --- 5. Event Listeners ---

    /**
     * Menambahkan event listener ke semua input dinamis
     */
    const attachItemRowListeners = (row) => {
        const deleteButton = row.querySelector(".delete-item-button");
        if (deleteButton) {
            deleteButton.addEventListener("click", () => deleteItemRow(deleteButton));
        }
        
        row.querySelectorAll(".item-calc").forEach(input => {
            input.addEventListener("input", calculateTotal);
        });

        const productSelect = row.querySelector(".product-select");
        if (productSelect) {
            productSelect.addEventListener("change", () => handleProductSelectChange(productSelect));
        }
    };

    // [DIUBAH] Listener untuk semua toggle
    typeIncome.addEventListener("change", updateFormForType);
    typeExpense.addEventListener("change", updateFormForType);
    typeCapital.addEventListener("change", updateFormForType);

    // [BARU] Listener untuk Status Pembayaran
    paymentStatusSelect.addEventListener("change", handlePaymentStatusChange);

    // Listener untuk tombol "Tambah Item"
    addItemButton.addEventListener("click", addNewItemRow);

    // Attach listener ke baris item pertama yang sudah ada
    attachItemRowListeners(document.querySelector(".item-row"));

    // [DIUBAH TOTAL] Listener untuk Form Submit
    transactionForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        
        submitButton.disabled = true;
        submitButton.textContent = "Menyimpan...";
        errorMessageEl.classList.add("hidden");

        try {
            // Kumpulkan data umum
            const formData = new FormData(transactionForm);
            const type = formData.get("type");
            const notes = formData.get("notes");
            
            let payload = {}; // Siapkan payload kosong

            if (type === "CAPITAL") {
                // --- Payload untuk Tipe Modal ---
                const capitalAmount = parseFloat(formData.get("capital_amount"));
                
                if (capitalAmount <= 0) {
                    throw new Error("Jumlah modal harus lebih besar dari 0.");
                }
                
                payload = {
                    type: type,
                    notes: notes,
                    total_amount: capitalAmount,
                    customer_id: null,
                    // [BARU] Modal selalu dianggap lunas dan tidak punya kategori
                    payment_status: "LUNAS", 
                    category_id: null,
                };

            } else if (type === "INCOME" || type === "EXPENSE") {
                // --- Payload untuk Tipe Pemasukan/Pengeluaran ---
                const customerIDRaw = formData.get("customer_id");
                const customerID = customerIDRaw ? parseInt(customerIDRaw, 10) : null;
                
                const categoryIDRaw = formData.get("category_id"); // [BARU]
                const categoryID = categoryIDRaw ? parseInt(categoryIDRaw, 10) : null; // [BARU]

                const paymentStatus = formData.get("payment_status"); // [BARU]
                const dueDate = formData.get("due_date"); // [BARU]

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
                    throw new Error("Transaksi Pemasukan/Pengeluaran harus memiliki minimal 1 item.");
                }

                payload = {
                    type: type,
                    customer_id: customerID, 
                    notes: notes,
                    items: items,
                    category_id: categoryID, // [BARU]
                    payment_status: paymentStatus, // [BARU]
                    due_date: dueDate || null, // [BARU]
                };
            } else {
                throw new Error("Tipe transaksi tidak dikenal.");
            }
            
            // Kirim ke API (Payload sudah benar)
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
            // Kembalikan teks tombol ke keadaan yang sesuai
            updateFormForType();
        }
    });

    // --- 6. Inisialisasi Halaman ---

    /**
     * [BARU] Fungsi inisialisasi untuk memperbaiki race condition
     * Memuat semua data SEBELUM merender form
     */
    const initializePage = async () => {
        try {
            // Jalankan semua proses load data secara paralel
            await Promise.all([
                loadProducts(),
                loadCustomers(),
                loadCategories()
            ]);
            
            // Setelah SEMUA data siap, baru render form
            updateFormForType();
            calculateTotal();
            
        } catch (error) {
            console.error("Gagal inisialisasi halaman:", error);
            errorMessageEl.textContent = "Gagal memuat data awal. Coba refresh halaman.";
            errorMessageEl.classList.remove("hidden");
        }
    };

    // [DIUBAH] Panggil fungsi inisialisasi
    initializePage();
});