# Stock & Inventory Management System

A full-stack, enterprise-grade inventory and e-commerce management platform built with **Spring Boot 3** (Backend) and **React 19 + Vite + Tailwind CSS** (Frontend).

---

## Architecture & Project Structure

The repository contains both backend and frontend in a unified workspace:

```text
Stock_Inventory_Spring/
├── .env.example                       # Backend environment template
├── pom.xml                            # Maven project definition
├── mvnw / mvnw.cmd                    # Maven wrapper scripts
├── src/                               # Spring Boot Backend
│   ├── main/
│   │   ├── java/com/setec/stock_inventory/
│   │   │   ├── config/                # Security, Cloudinary, App configs
│   │   │   ├── controller/            # REST API Controllers
│   │   │   ├── dto/                   # Request & Response DTOs
│   │   │   ├── entity/                # JPA Database Entities
│   │   │   ├── enums/                 # Roles (ADMIN, STOCK, USER), Statuses
│   │   │   ├── exception/             # Global exception handlers
│   │   │   ├── mapper/                # Entity-DTO Mappers
│   │   │   ├── repo/                  # Spring Data JPA Repositories
│   │   │   ├── security/              # JWT Filters, CustomUserDetailsService
│   │   │   └── service/               # Business logic & implementations
│   │   └── resources/
│   │       └── application.properties # Spring application properties
│   └── test/                          # Integration & Unit test suite
└── ui/                                # React Frontend (Storefront & Admin)
    ├── .env.example                   # Frontend environment template
    ├── package.json                   # Dependencies (React, Vite, Tailwind, Axios)
    ├── vite.config.js                 # Vite bundler configuration
    ├── tailwind.config.js             # Styling configuration
    ├── index.html                     # HTML root
    └── src/
        ├── admin/                     # Admin Portal (Dashboard, Inventory, Orders, Users)
        ├── api/                       # Axios API integration clients
        ├── components/                # Shared & Customer storefront components
        ├── context/                   # AuthContext, CartContext
        ├── pages/                     # Customer & Storefront pages
        └── routes.jsx                 # Client-side routing
```

---

## Key Features

### Backend (Spring Boot 3)
- **Authentication & RBAC**: JWT token-based authentication with role-based access control (`ROLE_ADMIN`, `ROLE_STOCK`, `ROLE_USER`).
- **Catalog & Inventory**: Product creation, categorized hierarchy, image galleries, and real-time inventory count tracking.
- **Stock Movements**: Audited Stock-In, Stock-Out, and Adjustment logs with transaction history.
- **E-Commerce Shopping Cart & Checkout**: User-authenticated carts, multi-item checkout, stock deduction, and order placement.
- **Order Processing**: Order status workflow (`PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`), receipt generation, and self-cancellation for users.
- **Media Upload**: Direct image upload and gallery management integrated with **Cloudinary**.
- **RESTful API**: Standardized JSON API response structure with global error handling.

### Frontend (React + Vite + Tailwind CSS)
- **Customer Storefront**:
  - Interactive homepage with search, categories, and featured products.
  - Public product catalog with instant filtering and search.
  - Product details view with multi-image gallery previews.
  - Interactive slide-out cart drawer and full checkout wizard.
  - Order history tracking and printable receipt views.
  - User account management and profile photo uploads.
- **Admin & Stock Portal**:
  - Live dashboard with inventory metrics, low-stock alerts, and financial totals.
  - Data tables for products, categories, orders, stock movements, and user management.
  - Modal workflows for stock in/out, product editing, batch image uploads, and force-delete operations.
  - Protected admin routes with automatic role redirection.

---

## Prerequisites

Ensure you have the following installed on your machine:
- **Java JDK 17+** (JDK 21 supported)
- **Node.js 18+** and **npm**
- **PostgreSQL 14+**
- (Optional) **Cloudinary Account** for media storage

---

## Quick Start Guide

### 1. Clone the Repository

```bash
git clone https://github.com/Bunheng123/Stock_Inventory_Spring.git
cd Stock_Inventory_Spring
git checkout develop
```

---

### 2. Configure & Run Backend (Spring Boot)

#### A. Database Setup
Create a PostgreSQL database:
```sql
CREATE DATABASE stock_inventory_spring;
```

#### B. Environment Configuration
Create a `.env` file in the root directory (or use your IDE's environment variables):
```env
# Database Credentials
DB_URL=jdbc:postgresql://localhost:5432/stock_inventory_spring
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password

# Cloudinary Credentials (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Security
JWT_SECRET=your_jwt_secret_key_minimum_256_bits_for_security_2026
JWT_EXPIRATION=86400000
```

#### C. Run the Spring Boot Application
```powershell
# Windows PowerShell / CMD
.\mvnw.cmd spring-boot:run

# macOS / Linux
./mvnw spring-boot:run
```
The backend will boot up at **`http://localhost:9090`**.

---

### 3. Configure & Run Frontend (React Vite UI)

#### A. Navigate to UI directory
```bash
cd ui
```

#### B. Environment Configuration
Create a `ui/.env` file:
```env
VITE_API_URL=http://localhost:9090
```

#### C. Install dependencies and start development server
```bash
npm install
npm run dev
```
The frontend application will be live at **`http://localhost:5173`**.

---

## Default Ports & URLs

| Service | URL | Description |
|---|---|---|
| **Frontend UI** | `http://localhost:5173` | Customer Storefront & Admin Portal |
| **Backend API** | `http://localhost:9090` | Spring Boot REST API Server |

---

## Core API Endpoints

### Authentication
- `POST /api/auth/register` - Register a customer account
- `POST /api/auth/login` - Authenticate and receive JWT token

### Products & Categories
- `GET /api/products` - Public catalog with search & category filters
- `GET /api/products/{id}` - Detailed product specifications & gallery
- `POST /api/products` - Create product *(ADMIN, STOCK)*
- `PUT /api/products/{id}` - Update product details *(ADMIN, STOCK)*
- `DELETE /api/products/{id}` - Delete product *(ADMIN)*
- `GET /api/categories` - List product categories
- `POST /api/categories` - Create new category *(ADMIN)*
- `DELETE /api/categories/{id}/force` - Force delete category and linked products *(ADMIN)*

### Cart & Orders
- `GET /api/cart` - Retrieve current user's cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/{id}` - Update cart item quantity
- `DELETE /api/cart/items/{id}` - Remove item from cart
- `POST /api/orders/checkout` - Checkout cart items into order
- `GET /api/orders/my-orders` - Retrieve authenticated user's order history
- `PUT /api/orders/{id}/cancel` - User self-cancellation for pending orders
- `GET /api/orders` - View all customer orders *(ADMIN, STOCK)*
- `PUT /api/orders/{id}/status` - Update order fulfillment status *(ADMIN, STOCK)*

### Inventory & Stock Movements
- `GET /api/stock-movements` - Query audited movement records *(ADMIN, STOCK)*
- `POST /api/stock-movements/in` - Register stock arrival *(ADMIN, STOCK)*
- `POST /api/stock-movements/out` - Register stock withdrawal *(ADMIN, STOCK)*
- `POST /api/stock-movements/adjust` - Adjust inventory discrepancy *(ADMIN)*

### Users & Profiles
- `GET /api/users/me` - Current user profile
- `PUT /api/users/me` - Update current user profile
- `POST /api/users/me/profile-picture` - Upload avatar image
- `GET /api/users` - List all system accounts *(ADMIN)*
- `PUT /api/users/{id}` - Update role / account details *(ADMIN)*
- `DELETE /api/users/{id}` - Delete user account *(ADMIN)*

---

## User Roles

| Role | Access Scope |
|---|---|
| **`ROLE_ADMIN`** | Full access: User management, category management, force delete, stock adjustments, order management, all reports. |
| **`ROLE_STOCK`** | Inventory operations: Product stock-in/stock-out, update products, view orders and stock ledger. |
| **`ROLE_USER`** | Customer access: Browse catalog, manage cart, place orders, cancel pending orders, update personal profile. |

---

## Git Workflow

- **`main`**: Production-ready releases.
- **`develop`**: Active development branch containing integrated features.
- **Feature Branches**: Branch off `develop` (e.g. `feature/your-feature`) and merge back into `develop`.
