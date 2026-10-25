# Full-Stack E-Commerce & FIFO Inventory Management System (Ecommerce_Spring_)

A production-ready B2C Retail Storefront and B2B Wholesale & Inventory ERP System built with **React 19** (Frontend) and **Spring Boot 3** (Backend).

This platform combines an interactive customer shopping experience with a rigorous back-office inventory engine featuring **FIFO (First-In, First-Out) batch depletion**, historical **COGS (Cost of Goods Sold)** profit analytics, supplier purchase order pipelines, B2B wholesale fulfillment, and asynchronous **Gmail SMTP** notifications.

---

## 🏗️ Tech Stack & Architecture

### Frontend (`Stock_Inventory/`)
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS (Monochrome editorial design system with custom SVG dual-axis spline charts & interactive physics)
- **State Management:** React Context API (`AuthContext`, `CartContext`, `WishlistContext`)
- **HTTP & Alerts:** Axios (with automatic JWT bearer token interceptors) + SweetAlert2 (`swalConfig`)
- **Routing:** React Router DOM (with protected Admin & Customer Route guards)

### Backend (`Stock_Inventory_Spring/`)
- **Framework:** Java 17+ (JDK 21 fully supported) & Spring Boot 3
- **Security:** Spring Security 6 + Stateless JWT (JSON Web Tokens) + BCrypt password hashing
- **Database & ORM:** PostgreSQL 14+ with Spring Data JPA / Hibernate & dynamic JPA Specification filtering
- **Cloud & Mail Services:** Cloudinary (image hosting & transformations) & Spring Mail (`@Async` Gmail SMTP HTML notifications)
- **Testing:** JUnit 5, Mockito & MockMvc Integration Test Suite

---

## 📂 Project Directory Structure

```text
Ecommerce_Spring_/
├── README.md
├── Stock_Inventory/                 # React 19 Frontend (Customer Storefront + Admin ERP)
│   ├── public/
│   │   ├── hero-rail/               # Transparent garment cutouts for interactive hero rail
│   │   └── favicon.svg              # App icon
│   ├── .env.example                 # Frontend environment template
│   ├── package.json                 # Dependencies (React 19, Vite, Tailwind CSS, Axios)
│   ├── vite.config.js               # Vite bundler configuration
│   └── src/
│       ├── admin/                   # Admin ERP Portal
│       │   ├── components/          # StatCard, SmoothSalesTrendChart, OrderViewModal
│       │   └── pages/               # Dashboard, Orders, Products, Categories, Brands,
│       │                            # LowStock, Suppliers, PurchaseOrders, WholesaleBuyers,
│       │                            # WholesaleOrders, Reports, StockMovements, Users
│       ├── api/                     # Axios API clients (auth, orders, products, reports, etc.)
│       ├── components/              # Customer UI, CartDrawer, OrderReceipt, Navbar, Footer
│       ├── context/                 # AuthContext, CartContext, WishlistContext
│       └── pages/
│           └── customer/            # HomePage, CatalogPage, ProductDetailPage, CheckoutPage,
│                                    # OrderHistoryPage, OrderDetailPage, WishlistPage, ProfilePage
│
└── Stock_Inventory_Spring/          # Spring Boot 3 Backend
    ├── .env.example                 # Backend environment template
    ├── pom.xml                      # Maven dependencies
    ├── mvnw / mvnw.cmd              # Maven wrapper
    └── src/
        ├── main/java/com/setec/stock_inventory/
        │   ├── config/              # SecurityConfig, CloudinaryConfig, CorsConfig, DataSeeder
        │   ├── controller/          # REST API Controllers (AuthController, ProductController, etc.)
        │   ├── dto/                 # Request, Response, Report & Email Payload DTOs
        │   ├── entity/              # JPA Entities (Product, Brand, Category, Order, StockBatch, etc.)
        │   ├── enums/               # OrderStatus, PaymentStatus, BatchStatus, Role, MovementType
        │   ├── exception/           # Global Exception Handling & Custom Exceptions
        │   ├── mapper/              # Entity <-> DTO Mapping logic
        │   ├── repo/                # Spring Data JPA Repositories
        │   ├── security/            # JwtAuthenticationFilter & CustomUserDetailsService
        │   ├── service/             # Business Logic, FIFO Batch Engine, Report & Email Services
        │   └── specification/       # Dynamic JPA Product & Order filtering specifications
        └── test/java/com/setec/stock_inventory/
                                     # Automated Integration Test Suite (Cart, FIFO, Reports, Wholesale)
```

---

## ✨ Complete Feature Summary

### 🛒 Customer Storefront
- **Interactive Garment Hero Rail (`/hero-rail/`):** Dynamic floating apparel rail with hover physics, transparent product cutouts, and quick-filter category navigation.
- **Server-Side Paginated Catalog:** High-performance product catalog with debounced live search, price range filtering, and relational Category & Brand selectors.
- **Smart Stock Telemetry Badges:** Real-time stock status flags:
  - `In Stock` for healthy inventory.
  - `ONLY X LEFT` scarcity hooks when inventory hits low thresholds.
  - Supplier-linked `COMING SOON` for incoming purchase order items.
- **Multi-Image Gallery & Related Items:** Product detail view with drag/click gallery previews, dimensional specs, and contextual recommendations.
- **Persistent Wishlist:** Client-side persisted wishlist drawer allowing customers to curate selections across sessions.
- **Interactive Slide-Out Cart Drawer:** Real-time subtotal, quantity updates, and automatic stock limit enforcement.
- **Tax & Shipping Engine Checkout:** Persisted 10% VAT calculation and free standard delivery threshold ($0 for orders ≥ $100, $5 flat rate otherwise).
- **Animated Delivery Scooter Tracker:** Live order tracker visualization progressing through `PENDING` ➔ `PROCESSING` ➔ `SHIPPED` ➔ `DELIVERED`.
- **2-Hour Refundable Self-Cancellation:** Customers can cancel pending orders within 2 hours of placement with automated stock restoration and cancellation confirmation.
- **Printable A4 Tax Receipt:** Thermal-style printable modal with complete itemization, order barcodes, payment method badges, and store details.
- **Privacy-First Customer Profile:** Self-service profile management with Cloudinary avatar image upload and BCrypt password change verification.

### 📊 Admin & Inventory ERP Portal (`/admin`)
- **Executive Operations Dashboard:**
  - 6 live KPI metric cards arranged 3-per-row on desktop:
    - **Row 1:** Total Orders (`Live DB`), Pending Orders (`All Clear` / `Needs Action`), Cancelled Orders (`Voided`).
    - **Row 2:** Total Revenue (`Settled`), Total Profit (`FIFO Net Margin`), Low-Stock Alerts (`Restock`).
  - Dual-axis interactive SVG spline charts displaying settled revenue waves, COGS depletion costs, and order volume across 7-Day, 30-Day, and Monthly views.
- **Order Fulfillment & Terminal Locking:** Transition orders through fulfillment milestones (`PENDING` ➔ `PROCESSING` ➔ `SHIPPED` ➔ `DELIVERED`); immutable terminal lock prevents unauthorized edits to cancelled or completed orders.
- **Catalog & Dimension Management:** Full CRUD operations for Products, Brands, and Categories with multi-angle Cloudinary image uploads.
- **Below Cost Price Protection:** Backend validation and frontend warning dialogs preventing accidental retail sales or wholesale contracts beneath item unit cost.
- **FIFO Inventory Batch Depletion Engine:**
  - Audited `stock_batches` table storing purchase date, unit cost, received quantity, and remaining quantity.
  - Automatic oldest-first batch consumption during retail and wholesale checkouts.
  - Permanent `EXHAUSTED` batch historical records ensuring accurate accounting even after lots are depleted.
- **Supplier & Purchase Order Pipeline:** Manage suppliers, generate Purchase Orders (`DRAFT` ➔ `ORDERED` ➔ `RECEIVED`), and automatically spawn new FIFO inventory batches upon warehouse receipt.
- **B2B Wholesale Portal:** Wholesale buyer directories, custom B2B wholesale pricing, credit limits, and wholesale order processing.
- **Financial Intelligence & Reports (`/admin/reports`):**
  - Gross Revenue, Net Product Revenue, Total Tax, Shipping, Total COGS, and Gross Profit calculations.
  - Best-seller leaderboards, Category revenue breakdown, and Brand performance.
  - One-click UTF-8 BOM Excel-compatible CSV exports for accounting.
- **Asynchronous Gmail SMTP Notifications:** Background thread execution (`@Async`) sending styled HTML emails for order receipts, self-cancellations, and admin refund alerts.
- **User & Role Administration:** View user activity, assign roles (`ROLE_ADMIN`, `ROLE_STOCK`, `ROLE_USER`), and instantly deactivate compromised accounts.

---

## 🚀 Step-by-Step Setup & Run Guide

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Java Development Kit (JDK):** Version 17 or higher (tested on JDK 21)
- **Node.js:** Version 18.x or higher & `npm`
- **PostgreSQL:** Version 14 or higher
- *(Optional)* **Cloudinary Account:** For product & avatar image hosting
- *(Optional)* **Gmail Account with App Password:** For outgoing email notifications

---

### 2. Database Creation
Connect to your local PostgreSQL instance and create the application database:
```sql
CREATE DATABASE stock_inventory_spring;
```

---

### 3. Environment Configuration

#### Backend Configuration (`Stock_Inventory_Spring/.env`)
Create a `.env` file in the `Stock_Inventory_Spring/` directory:
```env
# Database Credentials
DB_URL=jdbc:postgresql://localhost:5432/stock_inventory_spring
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password

# Cloudinary Credentials (Optional - image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT Security Configuration
JWT_SECRET=your_jwt_secret_key_minimum_256_bits_for_security_2026
JWT_EXPIRATION=86400000

# Mail Credentials (Gmail SMTP - Optional)
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_16_char_gmail_app_password

# Frontend URL & Admin Notification Alert
FRONTEND_URL=http://localhost:5173
ADMIN_EMAIL=admin@example.com
```

#### Frontend Configuration (`Stock_Inventory/.env`)
Create a `.env` file in the `Stock_Inventory/` directory:
```env
VITE_API_URL=http://localhost:9090
```

---

### 4. Running the Application

#### Start the Spring Boot Backend
Open a terminal in the `Stock_Inventory_Spring/` folder:

```powershell
# Windows (PowerShell or CMD)
.\mvnw.cmd spring-boot:run

# macOS / Linux
./mvnw spring-boot:run
```
*The Spring Boot server will start on `http://localhost:9090`.*

#### Start the React Frontend
Open a second terminal in the `Stock_Inventory/` folder:

```powershell
# Install frontend dependencies
npm install

# Start the Vite development server
npm run dev
```
*The React storefront will start on `http://localhost:5173`.*

---

## 🔑 Default Demo Credentials

The backend includes a `DataSeeder` that automatically seeds essential categories, brands, products, and default accounts upon initial startup:

| Role | Username | Password | Email | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | `admin123` | `hengheng513.513@gmail.com` | Full access to `/admin` ERP & Storefront |
| **Test Customer** | `customer2` | `1234` | `bunheng2209@example.com` | Customer Storefront, Cart & Profile |
| **Test Customer (Alt)** | `customer1` | `1234` | `heng513.513@gmail.com` | Customer Storefront, Cart & Profile |

---

## 🧪 Testing & Build Verification

### Backend Integration Tests (Spring Boot & JUnit 5)
Run the full test suite including FIFO batch calculations, order lifecycle tests, and reporting integration:

```powershell
cd Stock_Inventory_Spring

# Windows
.\mvnw.cmd test

# macOS / Linux
./mvnw test
```

### Frontend Code Quality & Production Build (React 19 & Vite)
Verify ESLint rules and compile the production bundle:

```powershell
cd Stock_Inventory

# Run ESLint validation
npm run lint

# Compile production build
npm run build
```

---

## 🛡️ Security & Privacy Notice
All sensitive files (`.env`, database passwords, private keys, compiled classes in `target/`, and `node_modules/`) are strictly excluded by `.gitignore` and are never committed to version control.
