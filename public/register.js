// Menunggu hingga seluruh konten halaman (HTML) dimuat
document.addEventListener("DOMContentLoaded", () => {
    
    // Ambil elemen-elemen yang kita butuhkan dari HTML
    const registerForm = document.getElementById("registerForm");
    const registerButton = document.getElementById("registerButton");
    const errorMessage = document.getElementById("errorMessage");
    const successMessage = document.getElementById("successMessage");

    // Cek keamanan: Arahkan ke dashboard jika sudah login (token sudah ada)
    const token = localStorage.getItem("goBisnisToken");
    if (token) {
        window.location.href = "/dashboard.html";
    }

    // Tambahkan event listener saat form di-submit
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // Mencegah form terkirim secara tradisional

        // Tampilkan status loading dan sembunyikan pesan
        registerButton.disabled = true;
        registerButton.textContent = "Mendaftar...";
        errorMessage.classList.add("hidden");
        successMessage.classList.add("hidden");

        // Ambil data dari form
        const fullName = event.target.full_name.value;
        const username = event.target.username.value;
        const email = event.target.email.value;
        const password = event.target.password.value;

        // Validasi frontend sederhana
        if (password.length < 6) {
            errorMessage.textContent = "Password minimal harus 6 karakter.";
            errorMessage.classList.remove("hidden");
            registerButton.disabled = false;
            registerButton.textContent = "Daftar";
            return;
        }

        // Kirim data ke API backend kita
        try {
            const response = await fetch("/api/v1/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    full_name: fullName,
                    username: username,
                    email: email,
                    password: password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Jika server mengembalikan error (misal: 409 Conflict)
                throw new Error(data.error || "Pendaftaran gagal");
            }

            // --- Registrasi Berhasil ---
            
            // Tampilkan pesan sukses
            successMessage.classList.remove("hidden");
            
            // Arahkan ke halaman login setelah 2 detik
            setTimeout(() => {
                window.location.href = "/"; // Arahkan ke index.html (halaman login)
            }, 2000);

        } catch (error) {
            // --- Registrasi Gagal ---

            // Tampilkan pesan error
            errorMessage.textContent = error.message;
            errorMessage.classList.remove("hidden");

            // Kembalikan tombol ke kondisi semula
            registerButton.disabled = false;
            registerButton.textContent = "Daftar";
        }
    });
});