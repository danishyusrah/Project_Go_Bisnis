// Menunggu hingga seluruh konten halaman (HTML) dimuat
document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Keamanan & Inisialisasi ---
    
    // Ambil token dari localStorage
    const token = localStorage.getItem("goBisnisToken");

    // GUARD: Jika tidak ada token, "tendang" kembali ke halaman login
    if (!token) {
        window.location.href = "/";
        return;
    }

    // Ambil elemen-elemen dari HTML
    const profileForm = document.getElementById("profileForm");
    const passwordForm = document.getElementById("passwordForm");
    const logoutButton = document.getElementById("logoutButton");
    
    const fullNameInput = document.getElementById("full_name");
    const emailInput = document.getElementById("email");
    const usernameInput = document.getElementById("username");
    
    const profileMessageEl = document.getElementById("profileMessage");
    const passwordMessageEl = document.getElementById("passwordMessage");

    const saveProfileButton = document.getElementById("saveProfileButton");
    const savePasswordButton = document.getElementById("savePasswordButton");

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
        return data;
    };

    /**
     * Helper untuk menampilkan pesan (sukses atau error)
     * @param {HTMLElement} el - Elemen pesan (profileMessageEl / passwordMessageEl)
     * @param {string} message - Teks pesan
     * @param {boolean} isSuccess - Apakah ini pesan sukses?
     */
    const showMessage = (el, message, isSuccess) => {
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

    // --- 3. Memuat Data Profil Awal ---

    const loadProfile = async () => {
        try {
            const data = await fetchWithAuth("/api/v1/profile");
            
            // Isi data ke dalam form
            fullNameInput.value = data.user.full_name;
            emailInput.value = data.user.email;
            usernameInput.value = data.user.username;

        } catch (error) {
            console.error("Gagal memuat profil:", error);
            showMessage(profileMessageEl, `Gagal memuat profil: ${error.message}`, false);
        }
    };

    // --- 4. Event Listeners ---

    // Handle "Simpan Perubahan Profil"
    profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        saveProfileButton.disabled = true;
        saveProfileButton.textContent = "Menyimpan...";
        profileMessageEl.classList.add("hidden");

        const payload = {
            full_name: fullNameInput.value,
            email: emailInput.value,
        };

        try {
            await fetchWithAuth("/api/v1/profile", {
                method: "PUT",
                body: JSON.stringify(payload),
            });
            
            showMessage(profileMessageEl, "Profil berhasil diperbarui!", true);
            // Muat ulang data (jika ada normalisasi di backend)
            loadProfile();

        } catch (error) {
            showMessage(profileMessageEl, `Error: ${error.message}`, false);
        } finally {
            saveProfileButton.disabled = false;
            saveProfileButton.textContent = "Simpan Perubahan Profil";
        }
    });

    // Handle "Ubah Password"
    passwordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        savePasswordButton.disabled = true;
        savePasswordButton.textContent = "Mengubah...";
        passwordMessageEl.classList.add("hidden");

        const oldPassword = document.getElementById("old_password").value;
        const newPassword = document.getElementById("new_password").value;

        if (newPassword.length < 6) {
             showMessage(passwordMessageEl, "Password baru minimal 6 karakter.", false);
             savePasswordButton.disabled = false;
             savePasswordButton.textContent = "Ubah Password";
             return;
        }

        const payload = {
            old_password: oldPassword,
            new_password: newPassword,
        };

        try {
            await fetchWithAuth("/api/v1/password", {
                method: "PUT",
                body: JSON.stringify(payload),
            });
            
            showMessage(passwordMessageEl, "Password berhasil diperbarui!", true);
            // Kosongkan form password
            passwordForm.reset();

        } catch (error)
 {
            showMessage(passwordMessageEl, `Error: ${error.message}`, false);
        } finally {
            savePasswordButton.disabled = false;
            savePasswordButton.textContent = "Ubah Password";
        }
    });

    // Handle Logout
    logoutButton.addEventListener("click", () => {
        localStorage.removeItem("goBisnisToken");
        window.location.href = "/";
    });


    // --- 5. Jalankan Load Data Awal ---
    loadProfile();
});