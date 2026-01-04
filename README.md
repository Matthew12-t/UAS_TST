# Circulation Service -- Smart Library

Express.js backend API for book loan management (circulation) with Supabase and JWT authentication.

## Features

- RESTful API for managing book loans
- Create loan, return loan, and calculate fines
- JWT authentication with role-based access control
- Swagger UI for interactive API documentation
- Supabase PostgreSQL database
- Docker support

## Tech Stack

- Node.js 18+
- Express.js
- Supabase (PostgreSQL)
- JWT (jsonwebtoken)
- Swagger UI
- Docker

## Prerequisites

- Node.js 18+
- Docker (optional)
- Supabase account

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd UAS_TST_II3160_18223096
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Update `.env` with your credentials:
```env
PORT=3002
JWT_SECRET=your-very-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=2h
MAX_ACTIVE_LOANS=3
DEFAULT_LOAN_DAYS=7
FINE_PER_DAY=1000
DATABASE_URL=postgresql://user:password@host:port/database
```

5. Set up Supabase table and policies (see below)

## Supabase Setup

Run this SQL in Supabase SQL Editor:

```sql
-- Create loans table
CREATE TABLE loans (
  loan_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  book_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  due_at TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ
);

-- Enable RLS and add policies
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON loans
FOR ALL USING (true) WITH CHECK (true);
```

## Running the Application

### Without Docker:
```bash
npm start
```

### With Docker:
```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Authentication

This API uses JWT (JSON Web Tokens) for authentication with role-based access control.

### Roles:
- **member**: Can create loans for themselves and view their own fines
- **librarian**: Full access (create loans for any user, process returns, view all fines)

### Generate Token (via /auth/login):
```bash
# Login as member
curl -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "role": "member"}'

# Login as librarian
curl -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "lib001", "role": "librarian"}'
```

## API Endpoints

You may access the endpoints by initializing the project on your local device or by accessing http://18223096.tesatepadang.space/

Swagger UI documentation is available at: http://18223096.tesatepadang.space/api-docs

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/login` | Public | Generate JWT token (dummy login for testing) |
| GET | `/health` | Authenticated | Check service and database health |
| POST | `/loan/create` | member, librarian | Create a new book loan |
| GET | `/loan/fines/:userId` | member, librarian | Get fines for a user |
| POST | `/loan/return` | librarian only | Process book return |

### Role-Based Access Control:
- **member**: Can only create loans and view fines for their own `userId`
- **librarian**: Can create loans for any user, view any user's fines, and process returns

## Testing

All requests (except `/auth/login`) require JWT token in Authorization header:

### Login to get token:
```powershell
# Get token as member
$response = Invoke-RestMethod -Uri "http://localhost:3002/auth/login" -Method POST -ContentType "application/json" -Body '{"userId":"user123","role":"member"}'
$token = $response.token
```

### Health check:
```powershell
Invoke-RestMethod -Uri "http://localhost:3002/health" -Headers @{Authorization="Bearer $token"}
```

### Create loan (member):
```powershell
Invoke-RestMethod -Uri "http://localhost:3002/loan/create" -Method POST -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body '{"userId":"user123","bookId":1,"days":7}'
```

### Get fines:
```powershell
Invoke-RestMethod -Uri "http://localhost:3002/loan/fines/user123" -Headers @{Authorization="Bearer $token"}
```

### Return loan (librarian only):
```powershell
# First login as librarian
$libResponse = Invoke-RestMethod -Uri "http://localhost:3002/auth/login" -Method POST -ContentType "application/json" -Body '{"userId":"lib001","role":"librarian"}'
$libToken = $libResponse.token

# Process return
Invoke-RestMethod -Uri "http://localhost:3002/loan/return" -Method POST -Headers @{Authorization="Bearer $libToken"} -ContentType "application/json" -Body '{"loanId":"L-1234567890-abc123"}'
```

## Error Responses

### 401 Unauthorized:
```json
{
  "error": "TidakTerautentikasi",
  "message": "Token Bearer tidak ditemukan. Tambahkan Authorization: Bearer <token>."
}
```

### 403 Forbidden:
```json
{
  "error": "AksesDitolak",
  "message": "Anda tidak memiliki izin untuk mengakses endpoint ini."
}
```

### 400 Bad Request (example):
```json
{
  "error": "PermintaanTidakValid",
  "message": "userId dan bookId wajib diisi."
}
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `JWT_SECRET` | Secret key for JWT signing | Yes | - |
| `PORT` | Server port | No | 3002 |
| `JWT_EXPIRES_IN` | JWT token expiration | No | 2h |
| `MAX_ACTIVE_LOANS` | Maximum active loans per user | No | 3 |
| `DEFAULT_LOAN_DAYS` | Default loan duration in days | No | 7 |
| `FINE_PER_DAY` | Fine amount per day late (IDR) | No | 1000 |

## Project Structure

```
.
├── src/
│   ├── server.js          # Main application file
│   └── swagger.js         # Swagger UI configuration
├── package.json           # Node.js dependencies
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose configuration
├── .env                  # Environment variables (not in git)
├── .gitignore            # Git ignore rules
├── .dockerignore         # Docker ignore rules
└── README.md             # This file
```

## License

MIT