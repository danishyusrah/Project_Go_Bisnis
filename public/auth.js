// Menunggu hingga seluruh konten halaman (HTML) dimuat
document.addEventListener("DOMContentLoaded", () => {
    // Ambil elemen-elemen yang kita butuhkan dari HTML
    const loginForm = document.getElementById("loginForm");
    const loginButton = document.getElementById("loginButton");
    const errorMessage = document.getElementById("errorMessage");

    // Cek keamanan: Arahkan ke dashboard jika sudah login (token sudah ada)
    const token = localStorage.getItem("goBisnisToken");
    if (token) {
        window.location.href = "/dashboard.html"; // Nanti kita buat halaman ini
    }

    // Tambahkan event listener saat form di-submit
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // Mencegah form terkirim secara tradisional

        // Tampilkan status loading dan sembunyikan error
        loginButton.disabled = true;
        loginButton.textContent = "Loading...";
        errorMessage.classList.add("hidden");

        // Ambil data dari form
        const username = event.target.username.value;
        const password = event.target.password.value;

        // Kirim data ke API backend kita
        try {
            const response = await fetch("/api/v1/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Jika server mengembalikan error (misal: 401 Unauthorized)
                throw new Error(data.error || "Login gagal");
            }

            // --- Login Berhasil ---
            
            // 1. Simpan token ke localStorage (penyimpanan di browser)
            // Ini adalah cara "profesional" untuk menyimpan sesi
            localStorage.setItem("goBisnisToken", data.token);

            // 2. Arahkan pengguna ke halaman dashboard
            window.location.href = "/dashboard.html"; // Kita akan buat halaman ini

        } catch (error) {
            // --- Login Gagal ---

            // Tampilkan pesan error
            errorMessage.textContent = error.message;
            errorMessage.classList.remove("hidden");

            // Kembalikan tombol ke kondisi semula
            loginButton.disabled = false;
            loginButton.textContent = "Login";
        }
    });
});