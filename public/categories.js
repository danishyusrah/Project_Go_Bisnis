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

    // Ambil elemen-elemen Form Tambah
    const addCategoryForm = document.getElementById("addCategoryForm");
    const addErrorMessage = document.getElementById("addErrorMessage");
    const submitButton = document.getElementById("submitButton");

    // Ambil elemen Daftar Kategori
    const incomeListEl = document.getElementById("income-category-list");
    const expenseListEl = document.getElementById("expense-category-list");

    // Ambil elemen Modal Edit
    const editModal = document.getElementById("edit-modal");
    const modalOverlay = document.getElementById("modal-overlay");
    const editForm = document.getElementById("edit-form");
    const editErrorMessage = document.getElementById("editErrorMessage");
    const editCategoryId = document.getElementById("edit_category_id");
    const editCategoryName = document.getElementById("edit_category_name");
    const editCategoryType = document.getElementById("edit_category_type");
    const updateButton = document.getElementById("updateButton");
    const deleteButton = document.getElementById("deleteButton");
    const cancelButton = document.getElementById("cancelButton");


    // --- 2. Fungsi Helper ---

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
        
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Terjadi kesalahan");
        }
        return data; // Berhasil (termasuk pesan sukses dari DELETE)
    };

    /**
     * Helper untuk menampilkan pesan error
     */
    const showMessage = (el, message, isSuccess = false) => {
        el.textContent = message;
        el.classList.remove("hidden");
        if (isSuccess) {
            el.classList.remove("bg-red-100", "text-red-700");
            el.classList.add("bg-green-100", "text-green-700");
        } else {
            el.classList.remove("bg-green-100", "text-green-700");
            el.classList.add("bg-red-100", "text-red-700");
        }
    };
    
    /**
     * Helper untuk menyembunyikan pesan error
     */
    const hideMessage = (el) => {
        el.classList.add("hidden");
        el.textContent = "";
    };

    // --- 3. Logika Utama (CRUD Kategori) ---

    /**
     * Memuat semua kategori dari API dan menampilkannya di daftar
     */
    const loadCategories = async () => {
        // Tampilkan skeleton (data lama dihapus oleh .innerHTML)
        incomeListEl.innerHTML = `<div class="p-4 bg-white rounded-xl card-shadow"><div class="skeleton h-5 w-1/2"></div></div>`;
        expenseListEl.innerHTML = `<div class="p-4 bg-white rounded-xl card-shadow"><div class="skeleton h-5 w-1/2"></div></div>`;
        
        try {
            const categories = (await fetchWithAuth("/api/v1/categories")) || [];
            
            // Pisahkan antara INCOME dan EXPENSE
            const incomeCats = categories.filter(cat => cat.type === "INCOME");
            const expenseCats = categories.filter(cat => cat.type === "EXPENSE");

            renderCategoryList(incomeListEl, incomeCats, "Pemasukan");
            renderCategoryList(expenseListEl, expenseCats, "Pengeluaran");

        } catch (error) {
            console.error("Gagal memuat kategori:", error);
            incomeListEl.innerHTML = `<p class="text-red-500">Gagal memuat kategori pemasukan.</p>`;
            expenseListEl.innerHTML = `<p class="text-red-500">Gagal memuat kategori pengeluaran.</p>`;
        }
    };

    /**
     * Helper untuk merender satu daftar (Pemasukan atau Pengeluaran)
     */
    const renderCategoryList = (listElement, categories, emptyText) => {
        listElement.innerHTML = ""; // Kosongkan
        
        if (categories.length === 0) {
            listElement.innerHTML = `<p class="text-gray-500 text-sm">Belum ada kategori ${emptyText}.</p>`;
            return;
        }

        categories.forEach(cat => {
            const catElement = document.createElement("div");
            catElement.className = "flex items-center justify-between p-4 bg-white rounded-xl card-shadow cursor-pointer hover:bg-gray-50";
            // Simpan data di elemen untuk dipakai modal edit
            catElement.dataset.id = cat.id;
            catElement.dataset.name = cat.name;
            catElement.dataset.type = cat.type;
            
            catElement.innerHTML = `
                <span class="font-medium text-gray-800">${cat.name}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400 lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
            `;
            
            // Tambahkan listener untuk membuka modal
            catElement.addEventListener("click", () => openEditModal(cat));
            
            listElement.appendChild(catElement);
        });
    };

    /**
     * Menangani submit form "Tambah Kategori Baru"
     */
    addCategoryForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideMessage(addErrorMessage);
        submitButton.disabled = true;
        submitButton.textContent = "Menyimpan...";

        const formData = new FormData(addCategoryForm);
        const payload = {
            name: formData.get("name"),
            type: formData.get("type"),
        };

        try {
            await fetchWithAuth("/api/v1/categories", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            
            addCategoryForm.reset(); // Kosongkan form
            await loadCategories(); // Muat ulang daftar
            
        } catch (error) {
            showMessage(addErrorMessage, error.message, false);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Simpan Kategori";
        }
    });


    // --- 4. Logika Modal Edit/Hapus ---

    /**
     * Membuka dan mengisi data ke modal
     */
    const openEditModal = (category) => {
        hideMessage(editErrorMessage);
        editCategoryId.value = category.id;
        editCategoryName.value = category.name;
        editCategoryType.value = category.type;
        editModal.classList.remove("hidden");
    };

    /**
     * Menutup dan membersihkan modal
     */
    const closeEditModal = () => {
        editModal.classList.add("hidden");
        editForm.reset();
    };

    // Listener untuk tombol "Simpan Perubahan" di modal
    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideMessage(editErrorMessage);
        updateButton.disabled = true;
        updateButton.textContent = "Menyimpan...";
        deleteButton.disabled = true; // Nonaktifkan hapus saat update

        const categoryID = editCategoryId.value;
        const payload = {
            name: editCategoryName.value,
            type: editCategoryType.value,
        };

        try {
            await fetchWithAuth(`/api/v1/categories/${categoryID}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });
            
            closeEditModal();
            await loadCategories();
            
        } catch (error) {
            showMessage(editErrorMessage, error.message, false);
        } finally {
            updateButton.disabled = false;
            updateButton.textContent = "Simpan Perubahan";
            deleteButton.disabled = false;
        }
    });

    // Listener untuk tombol "Hapus" di modal
    deleteButton.addEventListener("click", async () => {
        const categoryID = editCategoryId.value;
        const categoryName = editCategoryName.value;

        if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${categoryName}"? \n\n(Aksi ini tidak bisa dibatalkan dan hanya akan berhasil jika kategori tidak sedang dipakai oleh transaksi manapun).`)) {
            return;
        }
        
        hideMessage(editErrorMessage);
        updateButton.disabled = true;
        deleteButton.disabled = true;
        deleteButton.textContent = "Menghapus...";

        try {
            await fetchWithAuth(`/api/v1/categories/${categoryID}`, {
                method: "DELETE",
            });
            
            closeEditModal();
            await loadCategories();
            
        } catch (error) {
            // Tampilkan error jika kategori gagal dihapus (karena sedang dipakai)
            showMessage(editErrorMessage, error.message, false);
            updateButton.disabled = false;
            deleteButton.disabled = false;
            deleteButton.textContent = "Hapus";
        }
    });

    // Listener untuk tombol "Batal" dan overlay
    cancelButton.addEventListener("click", closeEditModal);
    modalOverlay.addEventListener("click", closeEditModal);


    // --- 5. Jalankan Load Awal ---
    loadCategories();
});