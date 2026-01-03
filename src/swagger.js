const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Circulation Service API",
      version: "1.0.0",
      description: "API untuk layanan sirkulasi perpustakaan (peminjaman dan pengembalian buku)",
      contact: {
        name: "Library System"
      }
    },
    servers: [
      {
        url: "http://18223096.tesatepadang.space",
        description: "Production server"
      },
      {
        url: "http://localhost:3002",
        description: "Development server"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Masukkan token JWT yang didapat dari /auth/login"
        }
      },
      schemas: {
        LoginRequest: {
          type: "object",
          required: ["userId", "role"],
          properties: {
            userId: {
              type: "string",
              description: "ID pengguna",
              example: "user123"
            },
            role: {
              type: "string",
              enum: ["member", "librarian"],
              description: "Role pengguna",
              example: "member"
            }
          }
        },
        LoginResponse: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description: "JWT token"
            },
            tokenType: {
              type: "string",
              example: "Bearer"
            },
            expiresIn: {
              type: "string",
              example: "2h"
            },
            payload: {
              type: "object",
              properties: {
                userId: { type: "string" },
                role: { type: "string" }
              }
            }
          }
        },
        CreateLoanRequest: {
          type: "object",
          required: ["userId", "bookId"],
          properties: {
            userId: {
              type: "string",
              description: "ID pengguna yang meminjam",
              example: "user123"
            },
            bookId: {
              type: "integer",
              description: "ID buku yang dipinjam",
              example: 1
            },
            days: {
              type: "integer",
              description: "Jumlah hari peminjaman (opsional, default 7 hari)",
              example: 7
            }
          }
        },
        CreateLoanResponse: {
          type: "object",
          properties: {
            loanId: {
              type: "string",
              description: "ID peminjaman yang dibuat"
            },
            userId: {
              type: "string"
            },
            bookId: {
              type: "integer"
            },
            dueAt: {
              type: "string",
              format: "date-time",
              description: "Tanggal jatuh tempo pengembalian"
            },
            policy: {
              type: "object",
              properties: {
                maxActiveLoans: { type: "integer" },
                defaultLoanDays: { type: "integer" },
                finePerDay: { type: "integer" }
              }
            }
          }
        },
        ReturnLoanRequest: {
          type: "object",
          required: ["loanId"],
          properties: {
            loanId: {
              type: "string",
              description: "ID peminjaman yang akan dikembalikan",
              example: "L-1234567890-abc123"
            }
          }
        },
        ReturnLoanResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Buku berhasil dikembalikan."
            },
            loanId: {
              type: "string"
            },
            returnedAt: {
              type: "string",
              format: "date-time"
            }
          }
        },
        FinesResponse: {
          type: "object",
          properties: {
            userId: {
              type: "string"
            },
            finePerDay: {
              type: "integer",
              description: "Denda per hari keterlambatan"
            },
            totalFine: {
              type: "integer",
              description: "Total denda"
            },
            loansCount: {
              type: "integer"
            },
            breakdown: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  loanId: { type: "string" },
                  bookId: { type: "integer" },
                  dueAt: { type: "string", format: "date-time" },
                  returnedAt: { type: "string", format: "date-time", nullable: true },
                  lateDays: { type: "integer" },
                  fine: { type: "integer" }
                }
              }
            }
          }
        },
        HealthResponse: {
          type: "object",
          properties: {
            status: {
              type: "string",
              example: "ok"
            },
            service: {
              type: "string",
              example: "circulation-service"
            },
            db: {
              type: "string",
              example: "ok"
            },
            user: {
              type: "object",
              properties: {
                userId: { type: "string" },
                role: { type: "string" }
              }
            }
          }
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Kode error"
            },
            message: {
              type: "string",
              description: "Pesan error"
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    paths: {
      "/auth/login": {
        post: {
          summary: "Login untuk mendapatkan token JWT",
          description: "Endpoint untuk autentikasi dan mendapatkan token JWT. Endpoint ini tidak memerlukan autentikasi.",
          tags: ["Autentikasi"],
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LoginRequest"
                }
              }
            }
          },
          responses: {
            200: {
              description: "Login berhasil",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/LoginResponse"
                  }
                }
              }
            },
            400: {
              description: "Request tidak valid",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            },
            500: {
              description: "Kesalahan server (JWT_SECRET belum diset)",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            }
          }
        }
      },
      "/health": {
        get: {
          summary: "Cek kesehatan service",
          description: "Endpoint untuk memeriksa status service dan koneksi database",
          tags: ["Health"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Service berjalan normal",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/HealthResponse"
                  }
                }
              }
            },
            401: {
              description: "Token tidak valid atau tidak ada",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            },
            500: {
              description: "Kesalahan server atau database",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            }
          }
        }
      },
      "/loan/create": {
        post: {
          summary: "Buat peminjaman buku baru",
          description: "Membuat peminjaman buku baru.\n- Member hanya bisa membuat peminjaman untuk dirinya sendiri\n- Librarian bisa membuat peminjaman untuk siapa saja\n- Maksimal peminjaman aktif: 3 buku per user\n- Default durasi peminjaman: 7 hari",
          tags: ["Peminjaman"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CreateLoanRequest"
                }
              }
            }
          },
          responses: {
            201: {
              description: "Peminjaman berhasil dibuat",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/CreateLoanResponse"
                  }
                }
              }
            },
            400: {
              description: "Request tidak valid",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            },
            401: {
              description: "Token tidak valid atau tidak ada",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            },
            403: {
              description: "Akses ditolak (member mencoba pinjam untuk user lain)",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            },
            409: {
              description: "Konflik (batas peminjaman tercapai atau buku sedang dipinjam)",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            },
            500: {
              description: "Kesalahan server",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            }
          }
        }
      },
      "/loan/fines/{userId}": {
        get: {
          summary: "Lihat denda peminjaman user",
          description: "Menampilkan informasi denda peminjaman untuk user tertentu.\n- Member hanya bisa melihat denda miliknya sendiri\n- Librarian bisa melihat denda siapa saja\n- Denda dihitung berdasarkan keterlambatan pengembalian",
          tags: ["Denda"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "userId",
              required: true,
              schema: {
                type: "string"
              },
              description: "ID user yang ingin dilihat dendanya",
              example: "user123"
            }
          ],
          responses: {
            200: {
              description: "Data denda berhasil diambil",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/FinesResponse"
                  }
                }
              }
            },
            401: {
              description: "Token tidak valid atau tidak ada",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            },
            403: {
              description: "Akses ditolak (member mencoba lihat denda user lain)",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            },
            500: {
              description: "Kesalahan server",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            }
          }
        }
      },
      "/loan/return": {
        post: {
          summary: "Kembalikan buku (khusus librarian)",
          description: "Memproses pengembalian buku. Hanya bisa dilakukan oleh librarian. Setelah dikembalikan, buku akan tersedia untuk dipinjam kembali.",
          tags: ["Peminjaman"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ReturnLoanRequest"
                }
              }
            }
          },
          responses: {
            200: {
              description: "Buku berhasil dikembalikan",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ReturnLoanResponse"
                  }
                }
              }
            },
            400: {
              description: "Request tidak valid",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            },
            401: {
              description: "Token tidak valid atau tidak ada",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            },
            403: {
              description: "Akses ditolak (bukan librarian)",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            },
            404: {
              description: "Peminjaman tidak ditemukan atau sudah dikembalikan",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            },
            500: {
              description: "Kesalahan server",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse"
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: []
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Setup Swagger routes
function setupSwagger(app, jwt, JWT_SECRET) {
  // Swagger UI route (tanpa auth)
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Circulation Service API Docs",
    swaggerOptions: {
      persistAuthorization: true
    }
  }));

  // Swagger JSON endpoint
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
}

module.exports = { setupSwagger, swaggerSpec };
