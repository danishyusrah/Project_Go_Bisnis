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

    // Variabel global untuk menyimpan data
    let userProducts = [];
    let userCustomers = [];
    let cartItems = []; // Keranjang belanja
    let debounceTimer;

    // --- 2. Ambil Elemen-Elemen PENTING dari HTML ---
    
    // Bagian Utama
    const productGrid = document.getElementById("product-grid");
    const productListContainer = document.getElementById("product-list-container");
    const noProductsMessage = document.getElementById("no-products-message");
    const searchBar = document.getElementById("searchBarPOS");
    
    // Bagian Keranjang (Umum)
    const cartItemsList = document.getElementById("cart-items-list");
    const emptyCartMessage = document.getElementById("empty-cart-message");
    const cartTotalAmount = document.getElementById("cartTotalAmount");
    const completeSaleButton = document.getElementById("completeSaleButton");
    
    // Form Pembayaran
    const customerSelect = document.getElementById("pos_customer_id");
    const paymentStatusSelect = document.getElementById("pos_payment_status");
    const errorMessagePOS = document.getElementById("errorMessagePOS");
    
    // Keranjang di Desktop
    const cartItemCountDesktop = document.getElementById("cart-item-count-desktop");

    // [PERUBAHAN UI MOBILE]
    // Tombol/Area untuk membuka/menutup keranjang di mobile
    const mobileSummaryBar = document.getElementById("mobile-summary-bar");
    const showCartButton = document.getElementById("show-cart-button");
    const closeCartButton = document.getElementById("close-cart-button");
    const mobileCartOverlay = document.getElementById("mobile-cart-overlay");
    // Info di summary bar mobile
    const mobileCartItemCount = document.getElementById("mobile-cart-item-count");
    const mobileCartTotal = document.getElementById("mobile-cart-total");

    // Toast Notifikasi
    const toastNotification = document.getElementById("toast-notification-pos");
    const toastMessage = document.getElementById("toast-message-pos");
    let toastTimer;

    // --- 3. Fungsi Helper ---

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

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
        if (response.status === 204) return null;
        return response.json();
    };

    const showToast = (message, isSuccess = true) => {
        clearTimeout(toastTimer);
        toastMessage.textContent = message;
        
        toastNotification.className = 'fixed bottom-20 right-5 lg:bottom-auto lg:top-5 z-50 px-4 py-3 rounded-lg shadow-lg transition-transform transform translate-y-0';
        if (isSuccess) {
            toastNotification.classList.add('bg-green-600', 'text-white');
            toastNotification.classList.remove('bg-red-600');
        } else {
            toastNotification.classList.add('bg-red-600', 'text-white');
            toastNotification.classList.remove('bg-green-600');
        }
        
        toastTimer = setTimeout(() => {
            toastNotification.className = toastNotification.className.replace('translate-y-0', 'translate-y-full lg:translate-y-0 lg:-translate-y-full');
            setTimeout(() => toastNotification.classList.add('hidden'), 300);
        }, 3000);
    };

    // --- 4. Fungsi Pemuatan Data (Loaders) ---

    // Memuat semua produk
    const loadProducts = async () => {
        try {
            userProducts = (await fetchWithAuth("/api/v1/products")) || [];
            renderProductGrid(userProducts);
        } catch (error) {
            console.error("Gagal memuat produk:", error);
            noProductsMessage.textContent = "Gagal memuat produk.";
            noProductsMessage.classList.remove("hidden");
        }
    };

    // Memuat semua pelanggan
    const loadCustomers = async () => {
        try {
            userCustomers = (await fetchWithAuth("/api/v1/customers")) || [];
            customerSelect.innerHTML = `<option value="">-- Umum (Tanpa Pelanggan) --</option>`;
            userCustomers.forEach(customer => {
                const option = document.createElement("option");
                option.value = customer.id;
                option.textContent = customer.name + (customer.phone ? ` (${customer.phone})` : "");
                customerSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Gagal memuat pelanggan:", error);
        }
    };

    // --- 5. Fungsi Tampilan (Renderers) ---

    // Merender kartu-kartu produk di grid
    const renderProductGrid = (products) => {
        productListContainer.innerHTML = ""; // Hapus skeleton
        
        if (products.length === 0) {
            noProductsMessage.classList.remove("hidden");
            return;
        }
        
        noProductsMessage.classList.add("hidden");

        products.forEach(product => {
            const card = document.createElement("button");
            card.className = "product-card bg-white rounded-xl shadow-sm border border-gray-200 p-3 text-left transition-all duration-150 ease-in-out hover:border-indigo-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed";
            card.dataset.id = product.id;
            
            // Nonaktifkan tombol jika stok 0
            if (product.stock <= 0) {
                card.disabled = true;
            }

            card.innerHTML = `
                <div class="flex justify-center items-center h-20 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400">
                        <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                        <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
                    </svg>
                </div>
                <p class="font-semibold text-gray-800 truncate">${product.name}</p>
                <p class="text-sm font-bold text-indigo-600">${formatCurrency(product.selling_price)}</p>
                <p class="text-xs text-gray-500 mt-1">Stok: ${product.stock}</p>
                ${product.stock <= 0 ? '<span class="text-xs font-bold text-red-500">HABIS</span>' : ''}
            `;
            productListContainer.appendChild(card);
        });
    };

    /**
     * [DIUBAH] Merender ulang tampilan keranjang dan total
     */
    const renderCart = () => {
        cartItemsList.innerHTML = "";
        let total = 0;
        
        // --- [PERBAIKAN DI SINI] ---
        // Menghitung total KUANTITAS, bukan hanya jumlah JENIS item
        const totalItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
        // --- [AKHIR PERBAIKAN] ---

        // [Mobile] Update summary bar
        mobileCartItemCount.textContent = `${totalItemCount} Item`; // <-- DIPERBAIKI

        // [DIUBAH] Gunakan totalItemCount
        if (totalItemCount === 0) {
            emptyCartMessage.classList.remove("hidden");
        } else {
            emptyCartMessage.classList.add("hidden");
            
            cartItems.forEach(item => {
                total += item.price * item.quantity;
                const itemElement = document.createElement("div");
                itemElement.className = "flex items-center space-x-3 py-3 border-b border-gray-100";
                itemElement.innerHTML = `
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-gray-800 truncate">${item.name}</p>
                        <p class="text-sm text-gray-500">${formatCurrency(item.price)}</p>
                    </div>
                    <!-- Tombol +/- -->
                    <div class="flex items-center space-x-2">
                        <button data-id="${item.id}" class="cart-item-qty-change p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200" data-change="-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                        <span class="font-medium w-6 text-center">${item.quantity}</span>
                        <button data-id="${item.id}" class="cart-item-qty-change p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200" data-change="1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                    </div>
                    <!-- Tombol Hapus -->
                    <button data-id="${item.id}" class="cart-item-remove p-1.5 rounded-full text-red-500 hover:bg-red-100">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                `;
                cartItemsList.appendChild(itemElement);
            });
        }
        
        // Update Total
        cartTotalAmount.textContent = formatCurrency(total);
    
        // Update mobile summary bar
        mobileCartTotal.textContent = formatCurrency(total);
    
        // Update desktop summary
        cartItemCountDesktop.textContent = `${totalItemCount} Item`; // <-- DIPERBAIKI

        // Atur tombol Selesaikan Penjualan
        if (totalItemCount > 0) { // <-- DIPERBAIKI
            completeSaleButton.disabled = false;
        } else {
            completeSaleButton.disabled = true;
        }
    };

    // --- 6. Logika Keranjang (Cart) ---

    // Menambah produk ke keranjang
    const addToCart = (productId) => {
        const product = userProducts.find(p => p.id === productId);
        if (!product) return;

        // Cek stok
        const itemInCart = cartItems.find(item => item.id === productId);
        const currentStockInCart = itemInCart ? itemInCart.quantity : 0;
        
        if (currentStockInCart >= product.stock) {
            showToast("Stok produk tidak mencukupi.", false);
            return;
        }

        if (itemInCart) {
            // Jika sudah ada, tambah quantity
            itemInCart.quantity++;
        } else {
            // Jika belum ada, tambahkan ke keranjang
            cartItems.push({
                id: product.id,
                name: product.name,
                price: product.selling_price,
                quantity: 1
            });
        }
        renderCart();
    };

    // Mengubah jumlah item di keranjang
    const updateCartQuantity = (productId, change) => {
        const itemInCart = cartItems.find(item => item.id === productId);
        if (!itemInCart) return;

        const newQuantity = itemInCart.quantity + change;

        if (newQuantity <= 0) {
            // Jika jadi 0, hapus item
            removeFromCart(productId);
            return;
        }
        
        // Cek stok
        const product = userProducts.find(p => p.id === productId);
        if (newQuantity > product.stock) {
            showToast("Stok produk tidak mencukupi.", false);
            return;
        }
        
        itemInCart.quantity = newQuantity;
        renderCart();
    };

    // Menghapus item dari keranjang
    const removeFromCart = (productId) => {
        cartItems = cartItems.filter(item => item.id !== productId);
        renderCart();
    };

    // Mengosongkan keranjang
    const clearCart = () => {
        cartItems = [];
        renderCart();
    };


    // --- 7. Logika Penyelesaian Penjualan ---
    
    const completeSale = async () => {
        // Validasi
        if (cartItems.length === 0) {
            showToast("Keranjang kosong.", false);
            return;
        }

        const customerIDRaw = customerSelect.value;
        const customerID = customerIDRaw ? parseInt(customerIDRaw, 10) : null;
        const paymentStatus = paymentStatusSelect.value;
        
        // Validasi jika belum lunas, wajib pilih pelanggan
        if (paymentStatus === 'BELUM LUNAS' && !customerID) {
            showToast("Pelanggan wajib diisi untuk transaksi Piutang (Belum Lunas).", false);
            errorMessagePOS.textContent = "Pelanggan wajib diisi untuk transaksi Piutang (Belum Lunas).";
            errorMessagePOS.classList.remove("hidden");
            return;
        }
        
        // Ubah format keranjang menjadi format API
        const payloadItems = cartItems.map(item => ({
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price
        }));

        const payload = {
            type: "INCOME",
            customer_id: customerID,
            payment_status: paymentStatus,
            items: payloadItems,
            notes: "Penjualan via POS"
            // due_date bisa ditambahkan di sini jika status "BELUM LUNAS"
        };
        
        // Tampilkan loading di tombol
        completeSaleButton.disabled = true;
        completeSaleButton.textContent = "Menyimpan...";
        errorMessagePOS.classList.add("hidden");

        try {
            await fetchWithAuth("/api/v1/transactions", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            // Sukses!
            showToast("Penjualan berhasil disimpan!", true);
            clearCart();
            closeCart(); // Tutup keranjang di mobile
            // Muat ulang produk untuk update stok
            loadProducts(); 

        } catch (error) {
            console.error("Gagal menyimpan transaksi:", error);
            showToast(`Gagal: ${error.message}`, false);
            errorMessagePOS.textContent = error.message;
            errorMessagePOS.classList.remove("hidden");
        } finally {
            // Kembalikan tombol ke semula
            completeSaleButton.disabled = false;
            completeSaleButton.textContent = "Selesaikan Penjualan";
            renderCart(); // Render ulang untuk atur state tombol
        }
    };


    // --- 8. Event Listeners ---

    // Pencarian Produk
    searchBar.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.toLowerCase();
        
        debounceTimer = setTimeout(() => {
            const filteredProducts = userProducts.filter(p => 
                p.name.toLowerCase().includes(query) || 
                (p.sku && p.sku.toLowerCase().includes(query))
            );
            renderProductGrid(filteredProducts);
        }, 300);
    });

    // Menambahkan item ke keranjang (via klik kartu produk)
    productListContainer.addEventListener("click", (e) => {
        const card = e.target.closest(".product-card");
        if (card) {
            const productId = parseInt(card.dataset.id, 10);
            addToCart(productId);
        }
    });

    // Mengubah/menghapus item di keranjang (via tombol di keranjang)
    cartItemsList.addEventListener("click", (e) => {
        const button = e.target.closest("button");
        if (!button) return;

        const productId = parseInt(button.dataset.id, 10);

        if (button.classList.contains("cart-item-qty-change")) {
            const change = parseInt(button.dataset.change, 10);
            updateCartQuantity(productId, change);
        }

        if (button.classList.contains("cart-item-remove")) {
            removeFromCart(productId);
        }
    });

    // Tombol Selesaikan Penjualan
    completeSaleButton.addEventListener("click", completeSale);

    // [PERUBAHAN UI MOBILE] Buka/Tutup Keranjang
    const openCart = () => {
        mobileCartOverlay.classList.remove("translate-y-full");
    };
    const closeCart = () => {
        mobileCartOverlay.classList.add("translate-y-full");
    };
    
    showCartButton.addEventListener("click", openCart);
    closeCartButton.addEventListener("click", closeCart);
    // Juga buka saat menggeser summary bar ke atas (opsional)
    mobileSummaryBar.addEventListener("click", openCart);


    // --- 9. Inisialisasi Halaman ---
    const initializePage = async () => {
        // Tampilkan keranjang kosong
        renderCart();
        // Muat produk dan pelanggan secara bersamaan
        await Promise.all([
            loadProducts(),
            loadCustomers()
        ]);
        // Sembunyikan skeleton grid (dilakukan di dalam renderProductGrid)
    };

    initializePage();
});