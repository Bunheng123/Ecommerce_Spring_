# Ecommerce_Spring_

Full-Stack E-Commerce & Inventory Management System built with **React (Frontend)** and **Spring Boot (Backend)**.

---

## Project Structure

```text
Ecommerce_Spring_/
├── .gitignore
├── README.md
├── Stock_Inventory/                 # React Frontend (Customer Storefront + Admin Dashboard)
│   ├── .env.example                 # Frontend environment template
│   ├── package.json                 # Dependencies (React 19, Vite, Tailwind CSS, Axios)
│   ├── vite.config.js               # Vite bundler config
│   ├── tailwind.config.js           # Tailwind CSS config
│   └── src/
│       ├── admin/                   # Admin Portal (Products, Categories, Orders, Movements, Users)
│       ├── api/                     # Axios API service clients
│       ├── components/              # Shared UI components
│       ├── context/                 # AuthContext & CartContext
│       └── pages/                   # Customer Storefront pages
│
└── Stock_Inventory_Spring/          # Spring Boot 3 Backend
    ├── .env.example                 # Backend environment template
    ├── pom.xml                      # Maven dependencies
    ├── mvnw / mvnw.cmd              # Maven wrapper
    └── src/
        ├── main/java/...            # Controllers, Services, Security, Repositories, Entities
        └── main/resources/          # Application properties
```

---

## Prerequisites

- **Java JDK 17+** (JDK 21 supported)
- **Node.js 18+** & **npm**
- **PostgreSQL 14+**
- (Optional) **Cloudinary Account** for product & profile image hosting

---

## Getting Started

### 1. Backend Setup (`Stock_Inventory_Spring`)

#### A. Database Creation
In PostgreSQL, create the database:
```sql
CREATE DATABASE stock_inventory_spring;
```

#### B. Environment Configuration
Inside the `Stock_Inventory_Spring` directory, copy `.env.example` to `.env`:
```env
# Database Credentials
DB_URL=jdbc:postgresql://localhost:5432/stock_inventory_spring
DB_USERNAME=postgres
DB_PASSWORD=your_password

# Cloudinary Credentials (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT Security
JWT_SECRET=your_jwt_secret_key_minimum_256_bits_for_security_2026
JWT_EXPIRATION=86400000
```

#### C. Run Backend
```powershell
cd Stock_Inventory_Spring

# Windows PowerShell / CMD
.\mvnw.cmd spring-boot:run

# macOS / Linux
./mvnw spring-boot:run
```
*The Spring Boot server will run at `http://localhost:9090`.*

---

### 2. Frontend Setup (`Stock_Inventory`)

#### A. Environment Configuration
Inside the `Stock_Inventory` directory, create `.env` from `.env.example`:
```env
VITE_API_URL=http://localhost:9090
```

#### B. Install & Run Dev Server
```powershell
cd Stock_Inventory
npm install
npm run dev
```
*The React application will run at `http://localhost:5173`.*

---

## Features

### 🛒 Customer Storefront
- **Catalog Browsing**: Real-time category filtering, search, and responsive product grid.
- **Product Details**: Multi-angle gallery previews, stock status badges, and description.
- **Cart & Checkout**: Interactive slide-out cart drawer, multi-step checkout flow, address input, and order placement.
- **Order Tracking**: Order history list, order cancellation for pending items, and printable receipt modal.
- **User Account**: Profile editing and avatar picture upload.

### 📊 Admin & Inventory Portal
- **Dashboard Overview**: KPI cards for total revenue, active orders, product inventory, and user count.
- **Product Management**: Full CRUD, image uploads with drag-and-drop gallery support, price/stock adjustments.
- **Category Management**: Categories CRUD and safe force-delete with linked product cleanup.
- **Inventory & Stock Movements**: Audited Stock-In, Stock-Out, and Adjustment records with reason tracking.
- **Low Stock Alerts**: Dedicated view for items with low stock thresholds with quick Restock dialogs.
- **Order Ledger**: Admin order status transitions (`PENDING` ➔ `PROCESSING` ➔ `SHIPPED` ➔ `DELIVERED` / `CANCELLED`).
- **User Administration**: Role assignment (`ROLE_ADMIN`, `ROLE_STOCK`, `ROLE_USER`) and status controls.

---

## Security & Privacy Note
All sensitive files (`.env`, database passwords, secret keys, build output `target/` and `node_modules/`) are securely ignored by Git and will never be committed to the repository.
