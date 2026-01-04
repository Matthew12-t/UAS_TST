# Circulation Service — Smart Library

> Layanan sirkulasi untuk sistem Smart Library yang menangani peminjaman buku, pengembalian, dan perhitungan denda keterlambatan.

---

## Dokumentasi API (Swagger)

Dokumentasi API interaktif tersedia di Swagger UI:

| Environment | URL |
|-------------|-----|
| **Publik** | [http://18223096.tesatepadang.space/api-docs](http://18223096.tesatepadang.space/api-docs) |
| **Lokal** | [http://localhost:3002/api-docs](http://localhost:3002/api-docs) |

> Gunakan Swagger UI untuk melihat spesifikasi lengkap dan menguji endpoint secara langsung.

---

## Tentang

Circulation Service adalah backend API yang dibangun dengan Express.js untuk mengelola proses sirkulasi buku di perpustakaan. Service ini menyediakan fitur lengkap mulai dari pembuatan transaksi peminjaman, penentuan jatuh tempo, perhitungan denda keterlambatan, hingga pemrosesan pengembalian buku. Dilengkapi dengan Swagger UI untuk dokumentasi dan testing API secara interaktif.

---

## Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| Peminjaman Buku | Membuat transaksi peminjaman dengan validasi lengkap |
| Jatuh Tempo Otomatis | Menentukan due date berdasarkan konfigurasi |
| Perhitungan Denda | Menghitung denda keterlambatan per hari |
| Pengembalian | Memproses pengembalian buku oleh pustakawan |
| Autentikasi JWT | Verifikasi identitas user menggunakan JSON Web Token |
| Otorisasi | Kontrol akses berbasis peran (member & librarian) |
| Swagger UI | Dokumentasi API interaktif |

---

## Tech Stack

| Teknologi | Versi/Keterangan |
|-----------|------------------|
| Node.js | 18+ |
| Express.js | Web framework |
| PostgreSQL | Via Supabase |
| JWT | jsonwebtoken |
| Swagger | swagger-ui-express |
| Docker | Containerization |

---

## Prasyarat

Sebelum memulai, pastikan Anda memiliki:
- Node.js versi 18 atau lebih baru
- Docker dan Docker Compose (opsional)
- Akun Supabase untuk database PostgreSQL

---

## Cara Instalasi

### 1. Clone Repository
```bash
git clone https://github.com/Matthew12-t/UAS_TST_II3160_18223096.git
cd UAS_TST_II3160_18223096
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Konfigurasi Environment
Buat file `.env` dan isi dengan konfigurasi berikut:
```env
PORT=3002
JWT_SECRET=your-very-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=2h
MAX_ACTIVE_LOANS=3
DEFAULT_LOAN_DAYS=7
FINE_PER_DAY=1000
DATABASE_URL=postgresql://user:password@host:port/database
```

### 4. Setup Database
Jalankan SQL berikut di Supabase SQL Editor:

```sql
-- Membuat tabel loans untuk menyimpan data peminjaman
CREATE TABLE loans (
  loan_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  book_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  due_at TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ
);

-- Mengaktifkan Row Level Security
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Membuat policy untuk akses tabel
CREATE POLICY "Allow all operations" ON loans
FOR ALL USING (true) WITH CHECK (true);
```

---

## Menjalankan Aplikasi

### Mode Development (tanpa Docker)
```bash
npm start
```

### Menggunakan Docker
```bash
# Build dan jalankan container
docker-compose up --build

# Jalankan di background
docker-compose up -d

# Lihat logs
docker-compose logs -f

# Hentikan container
docker-compose down
```

---

## Autentikasi (Authentication)

API menggunakan JWT (JSON Web Token) untuk autentikasi. Setiap request (kecuali `/auth/login`) harus menyertakan token di header `Authorization`.

### Cara Kerja

1. Client melakukan login ke `/auth/login` dengan `userId` dan `role`
2. Server mengembalikan JWT token yang berlaku selama 2 jam (default)
3. Client menyertakan token di setiap request dengan format: `Authorization: Bearer <token>`
4. Server memverifikasi token sebelum memproses request

### Mendapatkan Token

**Login sebagai Member:**
```bash
curl -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "role": "member"}'
```

**Login sebagai Librarian:**
```bash
curl -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "lib001", "role": "librarian"}'
```

### Respon Login Berhasil

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": "2h",
  "payload": {
    "userId": "user123",
    "role": "member"
  }
}
```

### Menggunakan Token

Sertakan token di header setiap request:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Otorisasi (Authorization)

Setelah autentikasi berhasil, sistem akan memeriksa peran (role) user untuk menentukan akses ke endpoint tertentu.

### Daftar Peran

| Peran | Deskripsi |
|-------|-----------|
| **member** | Anggota perpustakaan biasa |
| **librarian** | Pustakawan dengan akses penuh |

### Hak Akses per Endpoint

| Endpoint | member | librarian |
|----------|:------:|:---------:|
| `POST /auth/login` | Ya (tanpa token) | Ya (tanpa token) |
| `GET /health` | Ya | Ya |
| `POST /loan/create` | Ya (hanya untuk diri sendiri) | Ya (untuk semua user) |
| `GET /loan/fines/:userId` | Ya (hanya userId sendiri) | Ya (semua userId) |
| `POST /loan/return` | Tidak | Ya |

### Batasan Akses Member

1. **Membuat Peminjaman**: Member hanya dapat membuat peminjaman dengan `userId` yang sama dengan `userId` di token JWT
2. **Melihat Denda**: Member hanya dapat melihat denda untuk `userId` miliknya sendiri
3. **Pengembalian Buku**: Member tidak dapat memproses pengembalian buku

### Hak Akses Librarian

1. **Membuat Peminjaman**: Dapat membuat peminjaman untuk user mana pun
2. **Melihat Denda**: Dapat melihat denda semua user
3. **Pengembalian Buku**: Dapat memproses pengembalian buku

---

## Daftar Endpoint

**Base URL Lokal:** `http://localhost:3002`

**Base URL Publik:** `http://18223096.tesatepadang.space`

| Method | Endpoint | Akses | Fungsi |
|--------|----------|-------|--------|
| `POST` | `/auth/login` | Publik | Login dan generate token JWT |
| `GET` | `/health` | Semua user terautentikasi | Cek status service dan database |
| `POST` | `/loan/create` | member, librarian | Buat peminjaman baru |
| `GET` | `/loan/fines/:userId` | member (sendiri), librarian (semua) | Lihat denda user |
| `POST` | `/loan/return` | librarian | Proses pengembalian buku |

---

## Contoh Penggunaan

Gunakan `http://localhost:3002` untuk lokal atau `http://18223096.tesatepadang.space` untuk publik.

### PowerShell

**1. Login dan simpan token:**
```powershell
# Lokal
$response = Invoke-RestMethod -Uri "http://localhost:3002/auth/login" -Method POST -ContentType "application/json" -Body '{"userId":"user123","role":"member"}'

# Publik
$response = Invoke-RestMethod -Uri "http://18223096.tesatepadang.space/auth/login" -Method POST -ContentType "application/json" -Body '{"userId":"user123","role":"member"}'

$token = $response.token
```

**2. Cek kesehatan service:**
```powershell
# Lokal
Invoke-RestMethod -Uri "http://localhost:3002/health" -Headers @{Authorization="Bearer $token"}

# Publik
Invoke-RestMethod -Uri "http://18223096.tesatepadang.space/health" -Headers @{Authorization="Bearer $token"}
```

**3. Buat peminjaman:**
```powershell
# Lokal
Invoke-RestMethod -Uri "http://localhost:3002/loan/create" -Method POST -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body '{"userId":"user123","bookId":1,"days":7}'

# Publik
Invoke-RestMethod -Uri "http://18223096.tesatepadang.space/loan/create" -Method POST -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body '{"userId":"user123","bookId":1,"days":7}'
```

**4. Lihat denda:**
```powershell
# Lokal
Invoke-RestMethod -Uri "http://localhost:3002/loan/fines/user123" -Headers @{Authorization="Bearer $token"}

# Publik
Invoke-RestMethod -Uri "http://18223096.tesatepadang.space/loan/fines/user123" -Headers @{Authorization="Bearer $token"}
```

**5. Proses pengembalian (sebagai librarian):**
```powershell
# Lokal
$libResponse = Invoke-RestMethod -Uri "http://localhost:3002/auth/login" -Method POST -ContentType "application/json" -Body '{"userId":"lib001","role":"librarian"}'
$libToken = $libResponse.token
Invoke-RestMethod -Uri "http://localhost:3002/loan/return" -Method POST -Headers @{Authorization="Bearer $libToken"} -ContentType "application/json" -Body '{"loanId":"L-1234567890-abc123"}'

# Publik
$libResponse = Invoke-RestMethod -Uri "http://18223096.tesatepadang.space/auth/login" -Method POST -ContentType "application/json" -Body '{"userId":"lib001","role":"librarian"}'
$libToken = $libResponse.token
Invoke-RestMethod -Uri "http://18223096.tesatepadang.space/loan/return" -Method POST -Headers @{Authorization="Bearer $libToken"} -ContentType "application/json" -Body '{"loanId":"L-1234567890-abc123"}'
```

---

## Kode Error

### HTTP Status Code

| Kode | Keterangan |
|------|------------|
| 400 | Bad Request - Data request tidak valid |
| 401 | Unauthorized - Token tidak ditemukan atau tidak valid |
| 403 | Forbidden - Tidak memiliki izin akses |
| 404 | Not Found - Data tidak ditemukan |
| 409 | Conflict - Konflik data (batas tercapai atau data duplikat) |
| 500 | Internal Server Error - Kesalahan server |

### Daftar Error

| Error Code | HTTP | Pesan |
|------------|:----:|-------|
| `KonfigurasiServerSalah` | 500 | JWT_SECRET belum diset. Silakan isi JWT_SECRET di .env. |
| `PermintaanTidakValid` | 400 | userId dan role wajib diisi. |
| `PermintaanTidakValid` | 400 | userId harus berupa string yang tidak kosong. |
| `PermintaanTidakValid` | 400 | role harus bernilai "member" atau "librarian". |
| `PermintaanTidakValid` | 400 | userId dan bookId wajib diisi. |
| `PermintaanTidakValid` | 400 | bookId harus berupa bilangan bulat positif. |
| `PermintaanTidakValid` | 400 | days harus berupa bilangan bulat positif. |
| `PermintaanTidakValid` | 400 | loanId wajib diisi. |
| `PermintaanTidakValid` | 400 | loanId harus berupa string yang tidak kosong. |
| `TidakTerautentikasi` | 401 | Token Bearer tidak ditemukan. Tambahkan Authorization: Bearer <token>. |
| `TidakTerautentikasi` | 401 | Token tidak valid atau sudah kedaluwarsa. |
| `AksesDitolak` | 403 | Anda tidak memiliki izin untuk mengakses endpoint ini. |
| `AksesDitolak` | 403 | Member hanya boleh membuat peminjaman untuk userId miliknya sendiri. |
| `AksesDitolak` | 403 | Member hanya boleh melihat denda untuk userId miliknya sendiri. |
| `DataTidakDitemukan` | 404 | Data peminjaman tidak ditemukan atau sudah dikembalikan. |
| `BatasPeminjamanTercapai` | 409 | User sudah memiliki X peminjaman aktif. Batas maksimal adalah Y. |
| `BukuSedangDipinjam` | 409 | Buku dengan bookId X sedang dipinjam dan belum dikembalikan. |
| `KesalahanServer` | 500 | Gagal membuat peminjaman. |
| `KesalahanServer` | 500 | Gagal menghitung denda. |
| `KesalahanServer` | 500 | Gagal memproses pengembalian. |

### Contoh Respon Error

**401 Unauthorized:**
```json
{
  "error": "TidakTerautentikasi",
  "message": "Token Bearer tidak ditemukan. Tambahkan Authorization: Bearer <token>."
}
```

**403 Forbidden:**
```json
{
  "error": "AksesDitolak",
  "message": "Member hanya boleh membuat peminjaman untuk userId miliknya sendiri."
}
```

**409 Conflict:**
```json
{
  "error": "BatasPeminjamanTercapai",
  "message": "User sudah memiliki 3 peminjaman aktif. Batas maksimal adalah 3."
}
```

**500 Internal Server Error:**
```json
{
  "error": "KesalahanServer",
  "message": "Gagal membuat peminjaman.",
  "detail": "..."
}
```

---

## Konfigurasi Environment

| Variable | Deskripsi | Wajib | Default |
|----------|-----------|:-----:|:-------:|
| `DATABASE_URL` | Connection string PostgreSQL Supabase | Ya | - |
| `JWT_SECRET` | Secret key untuk signing token JWT | Ya | - |
| `PORT` | Port server | Tidak | 3002 |
| `JWT_EXPIRES_IN` | Masa berlaku token | Tidak | 2h |
| `MAX_ACTIVE_LOANS` | Batas peminjaman aktif per user | Tidak | 3 |
| `DEFAULT_LOAN_DAYS` | Durasi peminjaman default (hari) | Tidak | 7 |
| `FINE_PER_DAY` | Denda per hari keterlambatan (Rp) | Tidak | 1000 |

---

## Struktur Proyek

```
UAS_TST_II3160_18223096/
├── src/
│   ├── server.js       # Entry point aplikasi
│   └── swagger.js      # Konfigurasi Swagger UI
├── .env                # Environment variables
├── .gitignore          
├── .dockerignore       
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Docker Compose setup
├── package.json        
└── README.md           
```

---