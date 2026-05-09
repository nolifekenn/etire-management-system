# ETIRE
*(Technological University of the Philippines - Manila — Capstone 1 & 2)*

ETIRE (e-Tire Management System) digitizes and automates Queen.R Tire Supply & Vulcanizing Shop operations, covering inventory tracking, sales and services recording, and financial monitoring in a single web platform.

---

## 📚 Table of Contents

- [About the Project](#about-the-project)
- [Live Demo](#live-demo)
- [Getting Started](#getting-started)
- [User Roles & Permissions](#user-roles--permissions)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Contact & Support](#contact--support)

---

## 📖 About the Project

ETIRE is a full-stack management system built for multi-branch tire retail and service operations. It centralizes inventory, point-of-sale, service jobs, purchasing, customer records, and administrative controls with role-based access.

### Key Features

- Role-based access for administrators, branch managers, and staff
- Dashboard analytics and operational summaries
- Inventory and catalog management (per branch)
- Point-of-sale workflows and receipt generation
- Service job tracking and job item billing
- Purchasing and supplier management
- Customer and vehicle records
- Branch management and backup tools
- Admin panel for user management

### Tech Stack

| Layer    | Technologies |
| -------- | ------------ |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend  | Next.js API routes, TypeScript |
| Data     | PostgreSQL, Supabase |
| Auth     | Supabase Auth |
| Hosting  | Vercel, Supabase |

---

## 🚀 Live Demo

| Environment | URL | Purpose | Notes |
| ----------- | --- | ------- | ----- |
| Production | https://etire-mis.vercel.app | Public live environment | Deployed on Vercel with Supabase backend |

---

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Supabase project (PostgreSQL + Auth)

### Installation

1. Clone the repository.

```bash
git clone <your-repo-url>
cd etire-management-system
```

2. Install dependencies.

```bash
npm install
```

3. Copy the environment template and set values.

```bash
cp .env.local.template .env.local
```

4. Start the development server.

```bash
npm run dev
```

5. Open the app.

- http://localhost:3000

### Helpful Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```

### Environment Variables

Set these in `.env.local` (copied from `.env.local.template`).

```
DB_HOST=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
NEXT_PUBLIC_SITE_URL=
REPORT_TOKEN_SECRET=
NEXT_PUBLIC_ENABLE_CHATTER=
NEXT_PUBLIC_ENABLE_WORKSHOP=
NEXT_PUBLIC_ENABLE_PURCHASING=
```

> Do not commit real environment files or secrets to version control.

---

## 👥 User Roles & Permissions

ETIRE uses role-based access to control modules and actions.

| Capability | SUPER ADMIN | BRANCH MANAGER | STAFF | CASHIER | MECHANIC | Notes |
| ---------- | ----------- | -------------- | ----- | ------- | -------- | ----- |
| Access dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | Core landing page |
| Inventory management | ✅ | ✅ | ✅ | ❌ | ❌ | Includes branch stock and catalog |
| Point-of-sale | ✅ | ✅ | ❌ | ✅ | ❌ | Sales and receipts |
| Service jobs | ✅ | ✅ | ✅ | ❌ | ✅ | Job tracking and service billing |
| Purchasing | ✅ | ✅ | ✅ | ❌ | ❌ | RFQs and purchase orders |
| Customer management | ✅ | ✅ | ✅ | ❌ | ❌ | Customer and vehicle records |
| Reports | ✅ | ✅ | ❌ | ❌ | ❌ | Branch reporting module |
| Branch management | ✅ | ✅ | ❌ | ❌ | ❌ | Branch settings and status |
| Backup tools | ✅ | ✅ | ❌ | ❌ | ❌ | Backups and data export |
| Admin panel (user management) | ✅ | ❌ | ❌ | ❌ | ❌ | Super admin only |

> New accounts may start with limited access until an admin assigns the correct role.

---

## 🧭 Usage Guide

### Super Admin Workflow

1. Sign in and review system dashboards.
2. Manage users, assign roles, and configure access.
3. Audit branches, reports, and backups.
4. Oversee purchasing and inventory across branches.

### Branch Manager Workflow

1. Monitor branch performance and reports.
2. Approve or manage purchasing workflows.
3. Maintain branch inventory and services.
4. Run backup tasks as needed.

### Staff / Cashier / Mechanic Workflow

1. Use POS (cashier) or service modules (staff/mechanic).
2. Maintain inventory, customers, and service jobs (staff).
3. Complete daily operational tasks and log sales/services.

---

## 🔌 API Documentation

All API routes are exposed under the `/api` prefix.

### Base URL

- Local: http://localhost:3000/api
- Production: https://etire-mis.vercel.app/api

### Route Groups

| Route Group | Description |
| ----------- | ----------- |
| `/api/admin` | User and admin operations |
| `/api/auth` | Authentication and authorization helpers |
| `/api/backup` | Backup and export operations |
| `/api/branches` | Branch management |
| `/api/business-info` | Business profile info |
| `/api/chatter` | Internal messaging / chatter |
| `/api/inventory` | Inventory and stock operations |
| `/api/lookups` | Lookup tables and reference data |
| `/api/products` | Catalog products and pricing |
| `/api/receipt` | Receipt generation and retrieval |
| `/api/reports` | Report data endpoints |
| `/api/sales` | Sales processing |
| `/api/state-transition` | State changes and workflows |

---

## 🤝 Contributing

1. Create a feature branch.
2. Make focused changes with clear commit messages.
3. Run `npm run lint` and any relevant checks.
4. Open a pull request with a concise summary.

---

## 🛡️ Security

- Keep Supabase service keys server-only.
- Rotate credentials before production use.
- Limit admin access and review audit activity regularly.
- Never commit `.env.local` or database secrets.

---

## 📄 License

This repository does not currently publish a separate open-source license file. Treat the codebase as proprietary until a license is explicitly added by the project owners.

---

## 📬 Contact & Support

| Topic | Details |
| ----- | ------- |
| Maintainer | ETIRE Team |
| Support Email | support@etire.com |
| Security Contact | support@etire.com |
| Issue Tracker | GitHub Issues |
