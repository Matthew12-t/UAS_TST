# Circulation Service — Smart Library

Circulation Service adalah service untuk mengelola proses **peminjaman dan pengembalian buku** pada Smart Library. Fokus service ini hanya pada domain **circulation**: membuat transaksi peminjaman (loan), menentukan jatuh tempo (due date), menghitung denda keterlambatan (fine), dan memproses pengembalian (return). Service ini sudah dilengkapi **Swagger UI** untuk dokumentasi dan uji coba endpoint secara interaktif.

---

## CATATAN (HTTP vs HTTPS, CORS)

**CATATAN:** API yang benar sebenarnya adalah `http://18223096.tesatepadang.space`, tetapi karena keterbatasan browser yang menerapkan kebijakan CORS, maka Swagger UI ini menggunakan **HTTPS** untuk production server.

Untuk testing via Postman atau tools lain yang tidak terkena CORS, bisa menggunakan **HTTP maupun HTTPS**.

---

## Fitur

- **Swagger UI** untuk dokumentasi dan testing endpoint
- **JWT Authentication** (dummy login untuk testing)
- **Role-based Access Control**
  - `member`
    - hanya boleh membuat peminjaman untuk `userId` miliknya sendiri
    - hanya boleh melihat denda untuk `userId` miliknya sendiri
  - `librarian`
    - bisa membuat peminjaman untuk user lain
    - bisa memproses pengembalian buku
- **Create Loan**
  - validasi `userId`, `bookId`, optional `days`
  - batas maksimum peminjaman aktif per user (default 3)
  - mencegah peminjaman buku yang sedang dipinjam (loan aktif)
  - otomatis menentukan `dueAt` sesuai kebijakan durasi
- **Fine Calculation**
  - denda per hari keterlambatan (dibulatkan ke atas per hari)
  - total denda = `lateDays * finePerDay`
- **Return Loan** (khusus librarian)
  - set `returned_at = now()`
- **Healthcheck**
  - cek service + koneksi database

---

## Tech Stack

- Node.js + Express
- PostgreSQL (Supabase Postgres compatible)
- JWT: `jsonwebtoken`
- Swagger UI
- `dotenv`, `cors`

---