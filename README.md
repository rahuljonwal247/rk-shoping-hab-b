# E-Commerce Backend API

Production-grade REST API built with **Node.js / Express / TypeScript / PostgreSQL / Prisma / Redis**.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (optional)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Database Setup
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed with test data
npm run prisma:seed
```

### 4. Start Development Server
```bash
npm run dev
# API runs at http://localhost:5000
# Swagger docs at http://localhost:5000/api/docs
```

---

## 🐳 Docker

```bash
# Start all services (PostgreSQL + Redis + API)
docker-compose up -d

# View logs
docker-compose logs -f api
```

---

## 📋 API Endpoints

| Module | Base Path |
|--------|-----------|
| Auth | `/api/v1/auth` |
| Users | `/api/v1/users` |
| Seller | `/api/v1/seller` |
| Products | `/api/v1/products` |
| Categories | `/api/v1/categories` |
| Cart | `/api/v1/cart` |
| Orders | `/api/v1/orders` |
| Reviews | `/api/v1/reviews` |
| Payments | `/api/v1/payments` |
| Admin | `/api/v1/admin` |

Full API documentation: `http://localhost:5000/api/docs`

---

## 🔐 Test Credentials (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@shophub.com | Admin@123 |
| Seller | seller@shophub.com | Seller@123 |
| Customer | customer@shophub.com | Customer@123 |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

---

## 📁 Project Structure

```
src/
├── config/          # Database, Redis, Logger, Env
├── middleware/       # Auth, RBAC, RateLimit, Validate, Upload, Error
├── modules/
│   ├── auth/        # JWT auth, refresh tokens, OTP
│   ├── users/       # Profile, addresses, wishlist, notifications
│   ├── products/    # Product CRUD, images, search, approval
│   ├── categories/  # Category tree
│   ├── cart/        # Shopping cart management
│   ├── orders/      # Order placement, tracking, fulfilment
│   ├── payments/    # Stripe integration, webhooks
│   ├── reviews/     # Product reviews and ratings
│   └── admin/       # Dashboard, user management, disputes
├── prisma/          # Schema + seed
├── types/           # Shared TypeScript types
└── utils/           # Email, S3, Slugify
```

---

## 🔧 Environment Variables

See `.env.example` for full list.

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET` - 256-bit secret
- `JWT_REFRESH_SECRET` - 256-bit secret

**Optional (features degrade gracefully):**
- `STRIPE_SECRET_KEY` - Payments
- `SENDGRID_API_KEY` - Emails  
- `AWS_ACCESS_KEY_ID` + `AWS_S3_BUCKET` - File uploads

---

## 🏗️ Architecture

- **Layered Monolith**: Routes → Controllers → Services → Prisma
- **Authentication**: JWT access tokens (15min) + HTTP-only refresh tokens (7d)
- **Authorization**: RBAC middleware (ADMIN / SELLER / CUSTOMER)
- **Validation**: Zod schemas on all request bodies
- **Rate Limiting**: Redis-backed per-IP limits
- **Error Handling**: Centralized AppError hierarchy
- **File Uploads**: Multer → AWS S3 (memory storage fallback in dev)

---

## 🚢 Production Deployment

```bash
npm run build
npm start
```

Recommended: AWS ECS Fargate + RDS PostgreSQL + ElastiCache Redis + CloudFront CDN.

See `docker-compose.yml` for container configuration.
