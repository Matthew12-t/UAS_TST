require("dotenv").config();

const express = require("express");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const cors = require("cors");
const { setupSwagger } = require("./swagger");

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

// CONFIG
const PORT = parseInt(process.env.PORT || "3002", 10);
const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";

const MAX_ACTIVE_LOANS = parseInt(process.env.MAX_ACTIVE_LOANS || "3", 10);
const DEFAULT_LOAN_DAYS = parseInt(process.env.DEFAULT_LOAN_DAYS || "7", 10);
const FINE_PER_DAY = parseInt(process.env.FINE_PER_DAY || "1000", 10);

const DATABASE_URL = process.env.DATABASE_URL || "";

// Setup Swagger 
setupSwagger(app, jwt, JWT_SECRET);

// DB (Supabase Postgres)
if (!DATABASE_URL) {
  console.error("DATABASE_URL belum diset. Isi di .env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

// Helpers Function
function daysToMs(days) {
  return days * 24 * 60 * 60 * 1000;
}

function makeLoanId() {
  return `L-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function isValidUserId(val) {
  return typeof val === "string" && val.trim().length > 0;
}

function isValidBookId(val) {
  return Number.isInteger(val) && val > 0;
}

function isValidLoanId(val) {
  return typeof val === "string" && val.trim().length > 0;
}

// AUTH: Login dummy (untuk test Postman)
app.post("/auth/login", (req, res) => {
  if (!JWT_SECRET) {
    return res.status(500).json({
      error: "KonfigurasiServerSalah",
      message: "JWT_SECRET belum diset. Silakan isi JWT_SECRET di .env."
    });
  }

  const { userId, role } = req.body || {};
  if (!userId || !role) {
    return res.status(400).json({
      error: "PermintaanTidakValid",
      message: "userId dan role wajib diisi."
    });
  }

  if (!isValidUserId(String(userId))) {
    return res.status(400).json({
      error: "PermintaanTidakValid",
      message: "userId harus berupa string yang tidak kosong."
    });
  }

  if (!["member", "librarian"].includes(role)) {
    return res.status(400).json({
      error: "PermintaanTidakValid",
      message: 'role harus bernilai "member" atau "librarian".'
    });
  }

  const payload = { userId: String(userId), role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return res.json({ token, tokenType: "Bearer", expiresIn: JWT_EXPIRES_IN, payload });
});

// Middleware: JWT Auth
function jwtAuth(req, res, next) {
  const header = req.headers["authorization"] || "";
  const prefix = "Bearer ";

  if (!header.startsWith(prefix)) {
    return res.status(401).json({
      error: "TidakTerautentikasi",
      message: "Token Bearer tidak ditemukan. Tambahkan Authorization: Bearer <token>."
    });
  }

  const token = header.slice(prefix.length).trim();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { userId: String(decoded.userId), role: decoded.role };
    return next();
  } catch {
    return res.status(401).json({
      error: "TidakTerautentikasi",
      message: "Token tidak valid atau sudah kedaluwarsa."
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "AksesDitolak",
        message: "Anda tidak memiliki izin untuk mengakses endpoint ini."
      });
    }
    next();
  };
}

app.use(jwtAuth);

// Healthcheck
app.get("/health", async (req, res) => {
  try {
    await pool.query("select 1 as ok");
    return res.json({ status: "ok", service: "circulation-service", db: "ok", user: req.user });
  } catch (e) {
    console.error("DB ERROR FULL:", e); 
    return res.status(500).json({
      status: "error",
      service: "circulation-service",
      db: "error",
      detail: e?.message || String(e)
    });
  }
});

// POST /loan/create
app.post("/loan/create", requireRole("member", "librarian"), async (req, res) => {
  const { userId, bookId, days } = req.body || {};

  if (!userId || bookId === undefined || bookId === null) {
    return res.status(400).json({
      error: "PermintaanTidakValid",
      message: "userId dan bookId wajib diisi."
    });
  }

  if (!isValidUserId(String(userId))) {
    return res.status(400).json({
      error: "PermintaanTidakValid",
      message: "userId harus berupa string yang tidak kosong."
    });
  }

  if (!isValidBookId(bookId)) {
    return res.status(400).json({
      error: "PermintaanTidakValid",
      message: "bookId harus berupa bilangan bulat positif."
    });
  }

  if (days !== undefined && (!Number.isInteger(days) || days < 1)) {
    return res.status(400).json({
      error: "PermintaanTidakValid",
      message: "days harus berupa bilangan bulat positif."
    });
  }

  if (req.user.role === "member" && String(userId) !== String(req.user.userId)) {
    return res.status(403).json({
      error: "AksesDitolak",
      message: "Member hanya boleh membuat peminjaman untuk userId miliknya sendiri."
    });
  }

  const client = await pool.connect();
  try {
    const activeRes = await client.query(
      "select count(*)::int as cnt from public.loans where user_id=$1 and returned_at is null",
      [String(userId)]
    );
    const activeCount = activeRes.rows[0].cnt;

    if (activeCount >= MAX_ACTIVE_LOANS) {
      return res.status(409).json({
        error: "BatasPeminjamanTercapai",
        message: `User sudah memiliki ${activeCount} peminjaman aktif. Batas maksimal adalah ${MAX_ACTIVE_LOANS}.`
      });
    }

    const bookBorrowed = await client.query(
      "select loan_id from public.loans where book_id=$1 and returned_at is null",
      [bookId]
    );

    if (bookBorrowed.rowCount > 0) {
      return res.status(409).json({
        error: "BukuSedangDipinjam",
        message: `Buku dengan bookId ${bookId} sedang dipinjam dan belum dikembalikan.`
      });
    }

    const loanDays = Number.isFinite(days) ? Math.max(1, parseInt(days, 10)) : DEFAULT_LOAN_DAYS;

    const loanId = makeLoanId();
    const dueAt = new Date(Date.now() + daysToMs(loanDays));

    await client.query(
      `insert into public.loans (loan_id, user_id, book_id, due_at)
       values ($1, $2, $3, $4)`,
      [loanId, String(userId), bookId, dueAt.toISOString()]
    );

    return res.status(201).json({
      loanId,
      userId: String(userId),
      bookId,
      dueAt: dueAt.toISOString(),
      policy: {
        maxActiveLoans: MAX_ACTIVE_LOANS,
        defaultLoanDays: DEFAULT_LOAN_DAYS,
        finePerDay: FINE_PER_DAY
      }
    });
  } catch (e) {
    return res.status(500).json({
      error: "KesalahanServer",
      message: "Gagal membuat peminjaman.",
      detail: String(e?.message || e)
    });
  } finally {
    client.release();
  }
});

// GET /loan/fines/:userId
app.get("/loan/fines/:userId", requireRole("member", "librarian"), async (req, res) => {
  const userId = String(req.params.userId);

  if (req.user.role === "member" && userId !== String(req.user.userId)) {
    return res.status(403).json({
      error: "AksesDitolak",
      message: "Member hanya boleh melihat denda untuk userId miliknya sendiri."
    });
  }

  try {
    const result = await pool.query(
      `select loan_id, book_id, due_at, returned_at
       from public.loans
       where user_id=$1
       order by due_at asc`,
      [userId]
    );

    const now = Date.now();
    let totalFine = 0;

    const breakdown = result.rows.map((r) => {
      const dueAtMs = new Date(r.due_at).getTime();
      const endMs = r.returned_at ? new Date(r.returned_at).getTime() : now;

      const lateMs = endMs - dueAtMs;
      const lateDays = lateMs > 0 ? Math.ceil(lateMs / (24 * 60 * 60 * 1000)) : 0;

      const fine = lateDays * FINE_PER_DAY;
      totalFine += fine;

      return {
        loanId: r.loan_id,
        bookId: r.book_id,
        dueAt: r.due_at,
        returnedAt: r.returned_at,
        lateDays,
        fine
      };
    });

    return res.json({
      userId,
      finePerDay: FINE_PER_DAY,
      totalFine,
      loansCount: result.rows.length,
      breakdown
    });
  } catch (e) {
    return res.status(500).json({
      error: "KesalahanServer",
      message: "Gagal menghitung denda.",
      detail: String(e?.message || e)
    });
  }
});

// POST /loan/return (librarian only)
app.post("/loan/return", requireRole("librarian"), async (req, res) => {
  const { loanId } = req.body || {};
  if (!loanId) {
    return res.status(400).json({
      error: "PermintaanTidakValid",
      message: "loanId wajib diisi."
    });
  }

  if (!isValidLoanId(String(loanId))) {
    return res.status(400).json({
      error: "PermintaanTidakValid",
      message: "loanId harus berupa string yang tidak kosong."
    });
  }

  try {
    const result = await pool.query(
      `update public.loans
       set returned_at = now()
       where loan_id = $1 and returned_at is null
       returning loan_id, returned_at`,
      [String(loanId)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "DataTidakDitemukan",
        message: "Data peminjaman tidak ditemukan atau sudah dikembalikan."
      });
    }

    return res.json({
      message: "Buku berhasil dikembalikan.",
      loanId: result.rows[0].loan_id,
      returnedAt: result.rows[0].returned_at
    });
  } catch (e) {
    return res.status(500).json({
      error: "KesalahanServer",
      message: "Gagal memproses pengembalian.",
      detail: String(e?.message || e)
    });
  }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`jalan di port ${PORT}`);
});



