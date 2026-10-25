-- ============================================================================
-- FULL DATABASE RESTORE & SEED SCRIPT (Ecommerce_Spring_)
-- Target Database: stock_inventory_spring (PostgreSQL 14+ / 18+)
-- Export Timestamp: 2026-10-25
-- Description: Clean, idempotent, foreign-key safe full data restore script.
--
-- Safely clears child and parent tables in reverse foreign-key order,
-- restores 100% of live catalog, inventory, FIFO batches, orders & movements,
-- and resets all sequence counters to prevent ID collisions.
-- ============================================================================

-- If previous query in this session failed, clear the aborted transaction state
ROLLBACK;
BEGIN;

-- ----------------------------------------------------------------------------
-- 1. CLEAN EXISTING DATA IN REVERSE FOREIGN KEY ORDER
-- ----------------------------------------------------------------------------
DELETE FROM cart_items;
DELETE FROM carts;
DELETE FROM wishlist_items;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM wholesale_order_items;
DELETE FROM wholesale_orders;
DELETE FROM stock_batches;
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;
DELETE FROM stock_movements;
DELETE FROM product_images;
DELETE FROM products;
DELETE FROM wholesale_buyers;
DELETE FROM suppliers;
DELETE FROM brands;
DELETE FROM categories;
DELETE FROM users;

-- ----------------------------------------------------------------------------
-- 2. RESTORE TABLE DATA IN STRICT FORWARD FOREIGN KEY ORDER
-- ----------------------------------------------------------------------------

-- 2.1 USERS (4 rows)
INSERT INTO users (active, created_at, id, updated_at, phone, email, full_name, password, user_name, profile_image_url, profile_public_id, role) VALUES (true, '2026-10-21 23:15:00.385363', 4, '2026-10-25 09:20:44.362911', NULL, 'stock@example.com', NULL, '$2a$10$OFgcrVRABgXduA6/pmeFdOAaExvCG1a9mKfLKgnTi6t6VLEAXtVqK', 'stock', NULL, NULL, 'STOCK');
INSERT INTO users (active, created_at, id, updated_at, phone, email, full_name, password, user_name, profile_image_url, profile_public_id, role) VALUES (true, '2026-10-21 19:53:48.261201', 1, '2026-10-25 19:17:41.251979', '', 'hengheng513.513@gmail.com', 'admin', '$2a$10$hrHmsxve6MbguH7P/Sq98.SdNa/IkerirYdnFGJHq9kean8UonERy', 'admin', 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792594170/stock_inventory/profile/lpuvqneknu18fkj7kq79.jpg', 'stock_inventory/profile/lpuvqneknu18fkj7kq79', 'ADMIN');
INSERT INTO users (active, created_at, id, updated_at, phone, email, full_name, password, user_name, profile_image_url, profile_public_id, role) VALUES (true, '2026-10-21 19:53:48.328495', 2, '2026-10-25 19:24:57.344032', '024214213', 'bunheng2209@gmail.com', 'Customer2', '$2a$10$YPd0bAYZ6bDYZ3pBCuDUyOGe8TW6VRRnRt9zDq5FCAsphcfG9YjvC', 'customer2', 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792904245/stock_inventory/profile/e9hjf117wmxadv7govlk.jpg', 'stock_inventory/profile/e9hjf117wmxadv7govlk', 'USER');
INSERT INTO users (active, created_at, id, updated_at, phone, email, full_name, password, user_name, profile_image_url, profile_public_id, role) VALUES (true, '2026-10-21 19:53:48.381318', 3, '2026-10-25 19:32:47.501982', '012342423', 'heng513.513@gmail.com', 'Customer1', '$2a$10$x1T8RrmwYFD.hsQ.eOya/OE/ptKpfmParvdA1n0x4r6Tt.3so.Yp.', 'customer1', NULL, NULL, 'USER');

-- 2.2 CATEGORIES (6 rows)
INSERT INTO categories (created_at, id, updated_at, col_name, description) VALUES ('2026-10-21 21:52:08.522778', 1, '2026-10-21 21:52:08.522778', 'Shirts', 'Shirts & Tops');
INSERT INTO categories (created_at, id, updated_at, col_name, description) VALUES ('2026-10-21 22:04:39.781638', 2, '2026-10-21 22:04:39.781638', 'Jackets', 'Jackets & Outerwear');
INSERT INTO categories (created_at, id, updated_at, col_name, description) VALUES ('2026-10-22 08:37:17.630205', 30, '2026-10-22 08:37:17.630205', 'Shoes', 'loren');
INSERT INTO categories (created_at, id, updated_at, col_name, description) VALUES ('2026-10-25 09:54:43.00861', 40, '2026-10-25 09:54:43.00861', 'Knitwear & Hoodies', 'Heavyweight knits, vintage fleeces, and statement tops');
INSERT INTO categories (created_at, id, updated_at, col_name, description) VALUES ('2026-10-25 09:54:43.00861', 41, '2026-10-25 09:54:43.00861', 'Denim & Tailoring', 'Archival denim, structured trousers, and raw-hem blazers');
INSERT INTO categories (created_at, id, updated_at, col_name, description) VALUES ('2026-10-25 12:18:46.866564', 44, '2026-10-25 12:18:55.693748', 't-shirt', 'lorem 123');

-- 2.3 BRANDS (4 rows)
INSERT INTO brands (created_at, id, updated_at, name, description) VALUES ('2026-10-21 21:51:44.280674', 1, '2026-10-21 21:52:28.837929', 'Ralph Lauren', 'Classic American Luxury');
INSERT INTO brands (created_at, id, updated_at, name, description) VALUES ('2026-10-21 22:03:59.698236', 2, '2026-10-21 22:03:59.698236', 'Helmut Lang', 'Contemporary Minimalist Fashion');
INSERT INTO brands (created_at, id, updated_at, name, description) VALUES ('2026-10-21 22:25:50.735102', 3, '2026-10-22 08:37:40.063335', 'Golden Goose', 'Athletic and Sportswear');
INSERT INTO brands (created_at, id, updated_at, name, description) VALUES ('2026-10-25 09:54:43.00861', 9, '2026-10-25 09:54:43.00861', 'CTRL', 'Contemporary elevated essentials and statement silhouettes');

-- 2.4 SUPPLIERS (1 rows)
INSERT INTO suppliers (active, created_at, id, updated_at, phone, email, contact_person, name, address) VALUES (true, '2026-10-21 23:56:20.206586', 1, '2026-10-21 23:58:09.940295', '023495234', 'lukas@gmail.com', 'Lukas', 'Men Fashion', 'No. 86A, Street 110
Russian Federation Blvd (110)');

-- 2.5 WHOLESALE BUYERS (4 rows)
INSERT INTO wholesale_buyers (active, created_at, id, updated_at, phone, email, contact_person, name, address, type) VALUES (true, '2026-10-21 23:59:21.973642', 1, '2026-10-21 23:59:21.973642', '+85593435035', 'kante@gmail.com', 'Kante', 'Kante', 'No. 86A, Street 110
Russian Federation Blvd (110)', 'INDIVIDUAL');
INSERT INTO wholesale_buyers (active, created_at, id, updated_at, phone, email, contact_person, name, address, type) VALUES (true, '2026-10-25 12:33:16.181828', 14, '2026-10-25 12:33:16.181828', '12313121', 'limbunheng.kh@gmail.com', 'Lim Bunheng', 'setec', '3534', 'ORGANIZATION');
INSERT INTO wholesale_buyers (active, created_at, id, updated_at, phone, email, contact_person, name, address, type) VALUES (true, '2026-10-25 12:33:01.393845', 13, '2026-10-25 12:33:30.701905', '345456', 'limbunheng.kh@gmail.com', 'Lim Bunheng', 'Lim Bunheng', 'pp', 'INDIVIDUAL');
INSERT INTO wholesale_buyers (active, created_at, id, updated_at, phone, email, contact_person, name, address, type) VALUES (true, '2026-10-25 20:01:12.975102', 15, '2026-10-25 20:02:16.445032', '342342434', 'limbunheng.kh@gmail.com', 'Bunheng', 'Lim hengheng', 'kp', 'ORGANIZATION');

-- 2.6 PRODUCTS (11 rows)
INSERT INTO products (active, cost_price, price, reorder_level, stock, brand_id, category_id, deactivated_at, id, name, description, image_url, public_id) VALUES (true, 120, 150, 10, 29, 9, 44, NULL, 33, 'Silver star', 'Men''s Ball Star Leather and Metallic Low-Top Sneakers', 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792905648/stock_inventory/image/gmug3j8ktoestiwlvred.jpg', 'stock_inventory/image/gmug3j8ktoestiwlvred');
INSERT INTO products (active, cost_price, price, reorder_level, stock, brand_id, category_id, deactivated_at, id, name, description, image_url, public_id) VALUES (true, 95, 185, 5, 16, 9, 40, NULL, 1, 'Distressed CTRL Knit Sweater', 'Heavyweight distressed knit sweater crafted with raw edge ribbing and drop shoulders.', '/hero-rail/sweater.png', 'hero-rail/sweater');
INSERT INTO products (active, cost_price, price, reorder_level, stock, brand_id, category_id, deactivated_at, id, name, description, image_url, public_id) VALUES (true, 540, 595, 10, 5, 3, 30, NULL, 31, 'Black star', 'Men''s Ball Star Distressed Leather Low-Top Sneakers', 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792898712/stock_inventory/image/v03st76itqom4vlupjfb.png', 'stock_inventory/image/v03st76itqom4vlupjfb');
INSERT INTO products (active, cost_price, price, reorder_level, stock, brand_id, category_id, deactivated_at, id, name, description, image_url, public_id) VALUES (true, 45, 69.5, 10, 45, 1, 1, NULL, 5, 'Logo Cotton Jersey T-Shirt', 'Crafted of cotton jersey, this Polo Ralph Lauren crewneck T-shirt is detailed with contrast logo appliqué at the chest.', 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792898680/stock_inventory/image/kyucpe3cecibhe5h1okl.png', 'stock_inventory/image/kyucpe3cecibhe5h1okl');
INSERT INTO products (active, cost_price, price, reorder_level, stock, brand_id, category_id, deactivated_at, id, name, description, image_url, public_id) VALUES (true, 85, 165, 5, 24, 9, 40, NULL, 2, 'Washed CTRL Graphic Hoodie', 'Vintage washed heavyweight fleece hoodie featuring custom CTRL graphic and metal aglets.', '/hero-rail/hoodie.png', 'hero-rail/hoodie');
INSERT INTO products (active, cost_price, price, reorder_level, stock, brand_id, category_id, deactivated_at, id, name, description, image_url, public_id) VALUES (true, 110, 210, 5, 15, 9, 41, NULL, 3, 'Arcene Wide Leg Washed Denim', 'Wide-leg baggy washed denim jeans featuring reinforced belt loops and copper rivet hardware.', '/hero-rail/denim.png', 'hero-rail/denim');
INSERT INTO products (active, cost_price, price, reorder_level, stock, brand_id, category_id, deactivated_at, id, name, description, image_url, public_id) VALUES (true, 240, 300, 10, 7, 1, 1, NULL, 34, 'gray polo shirt', 'best fit polo shirt for men', 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792932011/stock_inventory/image/r6lmk3unfibt9xot0st0.jpg', 'stock_inventory/image/r6lmk3unfibt9xot0st0');
INSERT INTO products (active, cost_price, price, reorder_level, stock, brand_id, category_id, deactivated_at, id, name, description, image_url, public_id) VALUES (true, 310, 328.5, 10, 9, 2, 2, NULL, 6, 'Men''s Logo Cotton Jacket', 'This Helmut Lang jacket, crafted of cotton in Italy, features a point collar, drop shoulders, and subtle logo detailing.', 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792899034/stock_inventory/image/ik5sbzcmgnhe3mctsqip.png', 'stock_inventory/image/ik5sbzcmgnhe3mctsqip');
INSERT INTO products (active, cost_price, price, reorder_level, stock, brand_id, category_id, deactivated_at, id, name, description, image_url, public_id) VALUES (true, 45, 69.5, 10, 40, 1, 1, NULL, 7, 'Men''s Jersey Knit Logo T-Shirt', 'This cotton T-shirt features the "New York" logo across the chest, celebrating both the label''s and the founder''s home state.', 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792898736/stock_inventory/image/wipqf6o0gvyx1pcyw8cb.png', 'stock_inventory/image/wipqf6o0gvyx1pcyw8cb');
INSERT INTO products (active, cost_price, price, reorder_level, stock, brand_id, category_id, deactivated_at, id, name, description, image_url, public_id) VALUES (true, 520, 798, 10, 22, 2, 2, NULL, 22, 'Men''s Wool Trucker Jacket', 'Helmut Lang''s trucker jacket is crafted of wool, featuring a streamlined look with on-seam pockets and structured shoulders.', 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792898778/stock_inventory/image/nwubsowayam8z0ldhmzn.png', 'stock_inventory/image/nwubsowayam8z0ldhmzn');
INSERT INTO products (active, cost_price, price, reorder_level, stock, brand_id, category_id, deactivated_at, id, name, description, image_url, public_id) VALUES (true, 175, 340, 4, 10, 9, 41, NULL, 4, 'CTRL Raw-Hem Tailored Blazer', 'Architectural tailored double-breasted blazer with sharp peak lapels and a deconstructed raw hem.', '/hero-rail/blazer.png', 'hero-rail/blazer');

-- 2.7 PRODUCT IMAGES (25 rows)
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-22 07:50:44.372811', 38, 22, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792595607/stock_inventory/image/epfsk9t1oq7qokxhaskj.jpg', 'stock_inventory/image/epfsk9t1oq7qokxhaskj');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-22 07:50:44.372811', 36, 7, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792594461/stock_inventory/image/ceuypnhkqudjny11bs4t.jpg', 'stock_inventory/image/ceuypnhkqudjny11bs4t');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-22 07:50:44.372811', 37, 7, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792594464/stock_inventory/image/ql84ayunfs3vfckpun9e.jpg', 'stock_inventory/image/ql84ayunfs3vfckpun9e');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-22 07:50:44.372811', 34, 6, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792595467/stock_inventory/image/cnzkkpyme2g53srqub9f.jpg', 'stock_inventory/image/cnzkkpyme2g53srqub9f');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-22 07:50:44.372811', 35, 6, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792595482/stock_inventory/image/njezxu9tw9yzvpdc5jbi.jpg', 'stock_inventory/image/njezxu9tw9yzvpdc5jbi');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-22 07:50:44.372811', 32, 5, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792594957/stock_inventory/image/wswnjxgj9itoku905z38.jpg', 'stock_inventory/image/wswnjxgj9itoku905z38');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-22 07:50:44.372811', 33, 5, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792594960/stock_inventory/image/no6rihroqpnohq5a06xd.jpg', 'stock_inventory/image/no6rihroqpnohq5a06xd');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-22 07:50:44.372811', 39, 22, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792595615/stock_inventory/image/xrdefkkhtqrfgkb7418v.jpg', 'stock_inventory/image/xrdefkkhtqrfgkb7418v');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-22 08:40:27.423217', 40, 31, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792633227/stock_inventory/image/dmttpf4pdfyqz5epvdaz.jpg', 'stock_inventory/image/dmttpf4pdfyqz5epvdaz');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-22 08:40:29.569588', 41, 31, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792633229/stock_inventory/image/ty3nh5inkszoxap8fowp.jpg', 'stock_inventory/image/ty3nh5inkszoxap8fowp');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-22 08:40:31.750136', 42, 31, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792633231/stock_inventory/image/kmm8m9m79nwlqoyeorak.jpg', 'stock_inventory/image/kmm8m9m79nwlqoyeorak');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-22 08:40:33.614778', 43, 31, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792633233/stock_inventory/image/cnbxasenxk1q24iied6o.jpg', 'stock_inventory/image/cnbxasenxk1q24iied6o');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (true, '2026-10-25 09:54:43.00861', 44, 1, '/hero-rail/sweater.png', 'hero-rail/sweater');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (true, '2026-10-25 09:54:43.00861', 45, 2, '/hero-rail/hoodie.png', 'hero-rail/hoodie');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (true, '2026-10-25 09:54:43.00861', 46, 3, '/hero-rail/denim.png', 'hero-rail/denim');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (true, '2026-10-25 09:54:43.00861', 47, 4, '/hero-rail/blazer.png', 'hero-rail/blazer');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-25 12:22:04.71729', 48, 33, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792905724/stock_inventory/image/xumaqlpy7ptfguaveapl.jpg', 'stock_inventory/image/xumaqlpy7ptfguaveapl');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-25 12:22:06.854485', 49, 33, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792905726/stock_inventory/image/bstdbmtareqyhgrkjvct.jpg', 'stock_inventory/image/bstdbmtareqyhgrkjvct');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-25 12:22:10.08808', 50, 33, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792905729/stock_inventory/image/k51ucz6d9eqrvffb7ask.jpg', 'stock_inventory/image/k51ucz6d9eqrvffb7ask');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-25 12:22:12.609765', 51, 33, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792905732/stock_inventory/image/qdwdkrqvc15jg0eogc2x.jpg', 'stock_inventory/image/qdwdkrqvc15jg0eogc2x');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-25 12:22:18.090917', 52, 33, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792905737/stock_inventory/image/qh9mixmeztdvd2i8mugb.jpg', 'stock_inventory/image/qh9mixmeztdvd2i8mugb');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-25 19:46:51.19565', 53, 34, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792932410/stock_inventory/image/ghwdrxdhrkfk2qw1xq5m.jpg', 'stock_inventory/image/ghwdrxdhrkfk2qw1xq5m');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-25 19:46:54.708708', 54, 34, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792932413/stock_inventory/image/mzesqv7tqezt28jvlc0z.jpg', 'stock_inventory/image/mzesqv7tqezt28jvlc0z');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-25 19:46:58.255', 55, 34, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792932417/stock_inventory/image/ep4c4ejdbg8nfmxjpvor.jpg', 'stock_inventory/image/ep4c4ejdbg8nfmxjpvor');
INSERT INTO product_images (is_primary, created_at, id, product_id, image_url, public_id) VALUES (false, '2026-10-25 19:47:02.225149', 56, 34, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792932421/stock_inventory/image/g0szbsmxlo0nrbr6707t.jpg', 'stock_inventory/image/g0szbsmxlo0nrbr6707t');

-- 2.8 PURCHASE ORDERS (8 rows)
INSERT INTO purchase_orders (total_cost, id, order_date, supplier_id, update_date, user_id, status) VALUES (5400, 6, '2026-10-22 08:42:19.786912', 1, '2026-10-22 08:42:33.732298', 1, 'RECEIVED');
INSERT INTO purchase_orders (total_cost, id, order_date, supplier_id, update_date, user_id, status) VALUES (1280, 13, '2026-10-25 12:26:46.795711', 1, '2026-10-25 12:27:22.342285', 1, 'RECEIVED');
INSERT INTO purchase_orders (total_cost, id, order_date, supplier_id, update_date, user_id, status) VALUES (1245, 14, '2026-10-25 12:27:07.989292', 1, '2026-10-25 12:27:43.497179', 1, 'CANCELLED');
INSERT INTO purchase_orders (total_cost, id, order_date, supplier_id, update_date, user_id, status) VALUES (2880, 15, '2026-10-25 12:28:31.10559', 1, '2026-10-25 12:29:02.097093', 1, 'RECEIVED');
INSERT INTO purchase_orders (total_cost, id, order_date, supplier_id, update_date, user_id, status) VALUES (310, 16, '2026-10-25 12:31:29.271364', 1, '2026-10-25 12:31:36.633633', 1, 'CANCELLED');
INSERT INTO purchase_orders (total_cost, id, order_date, supplier_id, update_date, user_id, status) VALUES (3100, 17, '2026-10-25 12:31:47.458355', 1, '2026-10-25 12:31:52.772125', 1, 'RECEIVED');
INSERT INTO purchase_orders (total_cost, id, order_date, supplier_id, update_date, user_id, status) VALUES (2445, 18, '2026-10-25 19:43:09.790336', 1, '2026-10-25 19:43:30.58334', 1, 'RECEIVED');
INSERT INTO purchase_orders (total_cost, id, order_date, supplier_id, update_date, user_id, status) VALUES (2700, 19, '2026-10-25 19:58:18.841434', 1, '2026-10-25 19:59:26.678165', 1, 'RECEIVED');

-- 2.9 PURCHASE ORDER ITEMS (10 rows)
INSERT INTO purchase_order_items (cost_price, quantity, id, product_id, purchase_order_id) VALUES (540, 10, 7, 31, 6);
INSERT INTO purchase_order_items (cost_price, quantity, id, product_id, purchase_order_id) VALUES (320, 4, 16, 6, 13);
INSERT INTO purchase_order_items (cost_price, quantity, id, product_id, purchase_order_id) VALUES (45, 1, 17, 5, 14);
INSERT INTO purchase_order_items (cost_price, quantity, id, product_id, purchase_order_id) VALUES (120, 10, 18, 33, 14);
INSERT INTO purchase_order_items (cost_price, quantity, id, product_id, purchase_order_id) VALUES (320, 9, 19, 6, 15);
INSERT INTO purchase_order_items (cost_price, quantity, id, product_id, purchase_order_id) VALUES (310, 1, 20, 6, 16);
INSERT INTO purchase_order_items (cost_price, quantity, id, product_id, purchase_order_id) VALUES (310, 10, 21, 6, 17);
INSERT INTO purchase_order_items (cost_price, quantity, id, product_id, purchase_order_id) VALUES (240, 10, 22, 34, 18);
INSERT INTO purchase_order_items (cost_price, quantity, id, product_id, purchase_order_id) VALUES (45, 1, 23, 7, 18);
INSERT INTO purchase_order_items (cost_price, quantity, id, product_id, purchase_order_id) VALUES (540, 5, 24, 31, 19);

-- 2.10 STOCK BATCHES (19 rows)
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 20, 0, 545.00, 28, 31, NULL, '2026-10-22 08:38:40.478595', 'EXHAUSTED', 'BATCH-20261022-MAN-P31-001');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 80, 0, 210.00, 25, 6, NULL, '2026-10-10 08:00:00', 'EXHAUSTED', 'BATCH-P2-20261010-001');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 18, 16, 95.00, 37, 1, NULL, '2026-10-25 09:54:43.00861', 'ACTIVE', 'BATCH-INIT-1');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 100, 45, 45.00, 24, 5, NULL, '2026-10-10 08:00:00', 'ACTIVE', 'BATCH-P1-20261010-001');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 5, 0, 210.00, 42, 6, NULL, '2026-10-25 12:24:50.497943', 'EXHAUSTED', 'BATCH-20261025-MAN-P6-002');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 4, 0, 320.00, 43, 6, 13, '2026-10-25 12:27:22.330107', 'EXHAUSTED', 'BATCH-20261025-PO13-P6-003');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 9, 0, 320.00, 44, 6, 15, '2026-10-25 12:29:02.073018', 'EXHAUSTED', 'BATCH-20261025-PO15-P6-004');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 10, 9, 310.00, 45, 6, 17, '2026-10-25 12:31:52.359745', 'ACTIVE', 'BATCH-20261025-PO17-P6-005');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 30, 29, 120.00, 41, 33, NULL, '2026-10-25 12:20:49.182603', 'ACTIVE', 'BATCH-20261025-MAN-P33-001');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 1, 1, 45.00, 48, 7, 18, '2026-10-25 19:43:30.577327', 'ACTIVE', 'BATCH-20261025-PO18-P7-003');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 3, 0, 250.00, 46, 34, NULL, '2026-10-25 19:40:11.970844', 'EXHAUSTED', 'BATCH-20261025-MAN-P34-001');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 50, 22, 520.00, 27, 22, NULL, '2026-10-10 08:00:00', 'ACTIVE', 'BATCH-P22-20261010-001');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 10, 10, 175.00, 40, 4, NULL, '2026-10-25 09:54:43.00861', 'ACTIVE', 'BATCH-INIT-4');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 10, 0, 540.00, 29, 31, 6, '2026-10-22 08:42:33.72569', 'EXHAUSTED', 'BATCH-20261022-PO6-P31-002');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 5, 5, 540.00, 49, 31, 19, '2026-10-25 19:59:26.663465', 'ACTIVE', 'BATCH-20261025-PO19-P31-004');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 10, 7, 240.00, 47, 34, 18, '2026-10-25 19:43:30.572075', 'ACTIVE', 'BATCH-20261025-PO18-P34-002');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 90, 39, 45.00, 26, 7, NULL, '2026-10-10 08:00:00', 'ACTIVE', 'BATCH-P4-20261010-001');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 24, 24, 85.00, 38, 2, NULL, '2026-10-25 09:54:43.00861', 'ACTIVE', 'BATCH-INIT-2');
INSERT INTO stock_batches (expiry_date, initial_quantity, remaining_quantity, unit_cost, id, product_id, purchase_order_id, received_date, status, batch_number) VALUES (NULL, 15, 15, 110.00, 39, 3, NULL, '2026-10-25 09:54:43.00861', 'ACTIVE', 'BATCH-INIT-3');

-- 2.11 STOCK MOVEMENTS (57 rows)
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (50, 0, 50, '2026-10-10 08:00:00', 22, 22, 1, 'Initial supplier batch arrival', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (45, 50, 5, '2026-10-18 16:45:00', 28, 22, 1, 'Fulfilled wholesale order #3', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (44, 45, 1, '2026-10-19 17:00:00', 29, 22, 3, 'Fulfilled retail order #4', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (43, 44, 1, '2026-10-22 06:30:00', 36, 22, 2, 'Fulfilled retail order #7', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (30, 20, 10, '2026-10-22 08:42:33.728812', 38, 31, 1, 'Purchase Order #6', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (28, 30, 2, '2026-10-23 09:24:52.675136', 47, 31, 3, 'Order #20', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (30, 28, 2, '2026-10-23 09:25:19.586927', 48, 31, 3, 'Cancelled Order #20', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (90, 0, 90, '2026-10-10 08:00:00', 21, 7, 1, 'Initial supplier batch arrival', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (88, 90, 2, '2026-10-16 11:35:00', 25, 7, 3, 'Fulfilled retail order #2', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (86, 88, 2, '2026-10-20 10:00:00', 31, 7, 2, 'Fulfilled retail order #5', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (76, 86, 10, '2026-10-21 13:15:00', 35, 7, 1, 'Fulfilled wholesale order #5', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (80, 0, 80, '2026-10-10 08:00:00', 20, 6, 1, 'Initial supplier batch arrival', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (70, 80, 10, '2026-10-08 10:05:00', 24, 6, 1, 'Fulfilled wholesale order #1', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (68, 70, 2, '2026-10-17 14:25:00', 27, 6, 2, 'Fulfilled retail order #3', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (60, 68, 8, '2026-10-20 11:20:00', 32, 6, 1, 'Fulfilled wholesale order #4', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (59, 60, 1, '2026-10-21 15:30:00', 33, 6, 3, 'Fulfilled retail order #6', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (31, 35, 4, '2026-10-22 07:58:44.35227', 37, 6, 1, 'Wholesale Order #6', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (100, 0, 100, '2026-10-10 08:00:00', 19, 5, 1, 'Initial supplier batch arrival', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (97, 100, 3, '2026-10-02 10:30:00', 23, 5, 2, 'Fulfilled retail order #1', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (82, 97, 15, '2026-10-16 14:10:00', 26, 5, 1, 'Fulfilled wholesale order #2', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (78, 82, 4, '2026-10-20 10:00:00', 30, 5, 2, 'Fulfilled retail order #5', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (76, 78, 2, '2026-10-21 15:30:00', 34, 5, 3, 'Fulfilled retail order #6', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (18, 0, 18, '2026-10-25 09:54:43.00861', 51, 1, 1, 'Initial supplier batch arrival - Hero Collection', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (24, 0, 24, '2026-10-25 09:54:43.00861', 52, 2, 1, 'Initial supplier batch arrival - Hero Collection', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (15, 0, 15, '2026-10-25 09:54:43.00861', 53, 3, 1, 'Initial supplier batch arrival - Hero Collection', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (10, 0, 10, '2026-10-25 09:54:43.00861', 54, 4, 1, 'Initial supplier batch arrival - Hero Collection', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (23, 30, 7, '2026-10-25 10:37:26.440618', 55, 31, 3, 'Order #21', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (1, 23, 22, '2026-10-25 11:21:59.047616', 56, 31, 1, 'testing', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (0, 31, 31, '2026-10-25 11:22:18.709054', 57, 6, 1, 'testing', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (22, 25, 3, '2026-10-25 12:01:07.27682', 58, 22, 2, 'Order #22', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (16, 18, 2, '2026-10-25 12:01:07.27933', 59, 1, 2, 'Order #22', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (44, 45, 1, '2026-10-25 12:03:43.47283', 60, 5, 2, 'Order #23', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (21, 22, 1, '2026-10-25 12:05:46.657806', 61, 22, 3, 'Order #24', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (22, 21, 1, '2026-10-25 12:09:47.639657', 62, 22, 3, 'Cancelled Order #24', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (45, 44, 1, '2026-10-25 12:11:07.185022', 63, 5, 2, 'Cancelled Order #23', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (5, 0, 5, '2026-10-25 12:24:50.505544', 64, 6, 1, 'stockin', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (9, 5, 4, '2026-10-25 12:27:22.335709', 65, 6, 1, 'Purchase Order #13', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (0, 9, 9, '2026-10-25 12:28:06.147861', 66, 6, 1, '11', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (9, 0, 9, '2026-10-25 12:29:02.085562', 67, 6, 1, 'Purchase Order #15', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (19, 9, 10, '2026-10-25 12:31:52.76694', 68, 6, 1, 'Purchase Order #17', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (9, 19, 10, '2026-10-25 12:34:55.626728', 69, 6, 1, 'Wholesale Order #12', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (29, 30, 1, '2026-10-25 18:47:10.780711', 70, 33, 2, 'Order #25', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (21, 22, 1, '2026-10-25 19:30:48.791189', 71, 22, 2, 'Order #26', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (9, 10, 1, '2026-10-25 19:30:48.792187', 72, 4, 2, 'Order #26', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (0, 1, 1, '2026-10-25 19:30:48.793341', 73, 31, 2, 'Order #26', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (39, 40, 1, '2026-10-25 19:33:37.552292', 74, 7, 3, 'Order #27', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (13, 3, 10, '2026-10-25 19:43:30.576308', 75, 34, 1, 'Purchase Order #18', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (40, 39, 1, '2026-10-25 19:43:30.580402', 76, 7, 1, 'Purchase Order #18', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (8, 13, 5, '2026-10-25 19:47:52.514148', 77, 34, 3, 'Order #28', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (22, 21, 1, '2026-10-25 19:50:44.419147', 78, 22, 2, 'Cancelled Order #26', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (10, 9, 1, '2026-10-25 19:50:44.427136', 79, 4, 2, 'Cancelled Order #26', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (1, 0, 1, '2026-10-25 19:50:44.433154', 80, 31, 2, 'Cancelled Order #26', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (41, 40, 1, '2026-10-25 19:52:05.900355', 81, 7, 3, 'Cancelled Order #27', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (0, 1, 1, '2026-10-25 19:57:21.3949', 82, 31, 1, 'for testing', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (5, 0, 5, '2026-10-25 19:59:26.672253', 83, 31, 1, 'Purchase Order #19', 'STOCK_IN');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (7, 8, 1, '2026-10-25 20:04:59.832534', 84, 34, 1, 'Wholesale Order #13', 'STOCK_OUT');
INSERT INTO stock_movements (new_stock, previous_stock, quantity, created_at, id, product_id, user_id, reason, type) VALUES (40, 41, 1, '2026-10-25 20:04:59.852227', 85, 7, 1, 'Wholesale Order #13', 'STOCK_OUT');

-- 2.12 ORDERS (17 rows)
INSERT INTO orders (shipping_cost, subtotal, tax_amount, total_amount, id, order_date, update_date, user_id, customer_note, payment_method, payment_status, shipping_address, status) VALUES (0.00, 208.50, 0.00, 208.50, 1, '2026-10-02 10:15:00', '2026-10-02 10:30:00', 2, NULL, 'BANK_TRANSFER', 'PAID', 'Phnom Penh, Cambodia', 'COMPLETED');
INSERT INTO orders (shipping_cost, subtotal, tax_amount, total_amount, id, order_date, update_date, user_id, customer_note, payment_method, payment_status, shipping_address, status) VALUES (0.00, 139.00, 0.00, 139.00, 2, '2026-10-16 11:20:00', '2026-10-16 11:35:00', 3, NULL, 'CASH_ON_DELIVERY', 'PAID', 'Phnom Penh, Cambodia', 'COMPLETED');
INSERT INTO orders (shipping_cost, subtotal, tax_amount, total_amount, id, order_date, update_date, user_id, customer_note, payment_method, payment_status, shipping_address, status) VALUES (0.00, 657.00, 0.00, 657.00, 3, '2026-10-17 14:10:00', '2026-10-17 14:25:00', 2, NULL, 'BANK_TRANSFER', 'PAID', 'Siem Reap, Cambodia', 'COMPLETED');
INSERT INTO orders (shipping_cost, subtotal, tax_amount, total_amount, id, order_date, update_date, user_id, customer_note, payment_method, payment_status, shipping_address, status) VALUES (0.00, 798.00, 0.00, 798.00, 4, '2026-10-19 16:40:00', '2026-10-19 17:00:00', 3, NULL, 'BANK_TRANSFER', 'PAID', 'Phnom Penh, Cambodia', 'COMPLETED');
INSERT INTO orders (shipping_cost, subtotal, tax_amount, total_amount, id, order_date, update_date, user_id, customer_note, payment_method, payment_status, shipping_address, status) VALUES (0.00, 417.00, 0.00, 417.00, 5, '2026-10-20 09:30:00', '2026-10-20 10:00:00', 2, NULL, 'CASH_ON_DELIVERY', 'PAID', 'Battambang, Cambodia', 'COMPLETED');
INSERT INTO orders (shipping_cost, subtotal, tax_amount, total_amount, id, order_date, update_date, user_id, customer_note, payment_method, payment_status, shipping_address, status) VALUES (0.00, 467.50, 0.00, 467.50, 6, '2026-10-21 15:00:00', '2026-10-21 15:30:00', 3, NULL, 'BANK_TRANSFER', 'PAID', 'Phnom Penh, Cambodia', 'COMPLETED');
INSERT INTO orders (shipping_cost, subtotal, tax_amount, total_amount, id, order_date, update_date, user_id, customer_note, payment_method, payment_status, shipping_address, status) VALUES (0.00, 798.00, 0.00, 798.00, 7, '2026-10-22 06:15:00', '2026-10-22 06:30:00', 2, NULL, 'BANK_TRANSFER', 'PAID', 'Phnom Penh, Cambodia', 'COMPLETED');
INSERT INTO orders (shipping_cost, subtotal, tax_amount, total_amount, id, order_date, update_date, user_id, customer_note, payment_method, payment_status, shipping_address, status) VALUES (0.00, 1190.00, 119.00, 1309.00, 20, '2026-10-23 09:24:52.660981', '2026-10-23 09:25:19.621181', 3, '', 'QR_PAYMENT', 'REFUNDED', 'Customer1, No. 86A, Street 110, 12000, Phnom Penh, Switzerland (CH), (Tel: 012342423)', 'CANCELLED');
INSERT INTO orders (shipping_cost, subtotal, tax_amount, total_amount, id, order_date, update_date, user_id, customer_note, payment_method, payment_status, shipping_address, status) VALUES (0.00, 69.50, 0.00, 69.50, 8, '2026-10-22 07:05:00', '2026-10-24 22:20:59.485637', 3, NULL, 'BANK_TRANSFER', 'PAID', 'Phnom Penh, Cambodia', 'COMPLETED');
INSERT INTO orders (shipping_cost, subtotal, tax_amount, total_amount, id, order_date, update_date, user_id, customer_note, payment_method, payment_status, shipping_address, status) VALUES (0.00, 4165.00, 416.50, 4581.50, 21, '2026-10-25 10:37:26.42407', '2026-10-25 10:37:52.951144', 3, '', 'QR_PAYMENT', 'PAID', 'Customer1, No. 86A, Street 110, 12000, Phnom Penh, Switzerland (CH), (Tel: 012342423)', 'COMPLETED');
INSERT INTO orders (shipping_cost, subtotal, tax_amount, total_amount, id, order_date, update_date, user_id, customer_note, payment_method, payment_status, shipping_address, status) VALUES (0.00, 2764.00, 276.40, 3040.40, 22, '2026-10-25 12:01:07.26893', '2026-10-25 12:06:36.482959', 2, '', 'QR_PAYMENT', 'PAID', 'Customer2, test, test, test, Switzerland (CH), (Tel: 024214213)', 'COMPLETED');
INSERT INTO orders (shipping_cost, subtotal, tax_amount, total_amount, id, order_date, update_date, user_id, customer_note, payment_method, payment_status, shipping_address, status) VALUES (0.00, 798.00, 79.80, 877.80, 24, '2026-10-25 12:05:46.654809', '2026-10-25 12:09:47.642657', 3, '', 'CASH_ON_DELIVERY', 'REFUNDED', 'Customer1, test, test, test, Switzerland (CH), (Tel: 012342423)', 'CANCELLED');
INSERT INTO orders (shipping_cost, subtotal, tax_amount, total_amount, id, order_date, update_date, user_id, customer_note, payment_method, payment_status, shipping_address, status) VALUES (5.00, 69.50, 6.95, 81.45, 23, '2026-10-25 12:03:43.469828', '2026-10-25 12:11:07.189548', 2, '', 'CASH_ON_DELIVERY', 'UNPAID', 'Customer2, test, test, test, Switzerland (CH), (Tel: 024214213)', 'CANCELLED');
INSERT INTO orders (shipping_cost, subtotal, tax_amount, total_amount, id, order_date, update_date, user_id, customer_note, payment_method, payment_status, shipping_address, status) VALUES (0.00, 150.00, 15.00, 165.00, 25, '2026-10-25 18:47:10.780711', '2026-10-25 18:49:26.403993', 2, '', 'QR_PAYMENT', 'PAID', 'Customer2, test, test, test, Switzerland (CH), (Tel: 024214213)', 'COMPLETED');
INSERT INTO orders (shipping_cost, subtotal, tax_amount, total_amount, id, order_date, update_date, user_id, customer_note, payment_method, payment_status, shipping_address, status) VALUES (0.00, 1733.00, 173.30, 1906.30, 26, '2026-10-25 19:30:48.779666', '2026-10-25 19:50:44.451069', 2, '', 'QR_PAYMENT', 'REFUNDED', 'Customer2, test, test, test, Switzerland (CH), (Tel: 024214213)', 'CANCELLED');
INSERT INTO orders (shipping_cost, subtotal, tax_amount, total_amount, id, order_date, update_date, user_id, customer_note, payment_method, payment_status, shipping_address, status) VALUES (5.00, 69.50, 6.95, 81.45, 27, '2026-10-25 19:33:37.546562', '2026-10-25 19:52:05.903864', 3, '', 'CASH_ON_DELIVERY', 'UNPAID', 'Customer1, test, test, test, Switzerland (CH), (Tel: 012342423)', 'CANCELLED');
INSERT INTO orders (shipping_cost, subtotal, tax_amount, total_amount, id, order_date, update_date, user_id, customer_note, payment_method, payment_status, shipping_address, status) VALUES (0.00, 1500.00, 150.00, 1650.00, 28, '2026-10-25 19:47:52.511066', '2026-10-25 19:55:24.372295', 3, '', 'BANK_TRANSFER', 'PAID', 'Customer1, test, test, test, Switzerland (CH), (Tel: 012342423)', 'COMPLETED');

-- 2.13 ORDER ITEMS (22 rows)
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (798, 1, 520.00, 520.00, 11, 4, 22);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (798, 1, 520.00, 520.00, 16, 7, 22);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (595, 2, 1090.00, 545.00, 31, 20, 31);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (69.5, 2, 90.00, 45.00, 9, 2, 7);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (69.5, 2, 90.00, 45.00, 13, 5, 7);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (328.5, 2, 420.00, 210.00, 10, 3, 6);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (328.5, 1, 210.00, 210.00, 14, 6, 6);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (69.5, 3, 135.00, 45.00, 8, 1, 5);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (69.5, 4, 180.00, 45.00, 12, 5, 5);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (69.5, 2, 90.00, 45.00, 15, 6, 5);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (69.5, 1, 45.00, 45.00, 17, 8, 5);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (595, 7, 3815.00, 545.00, 32, 21, 31);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (798, 3, 1560.00, 520.00, 33, 22, 22);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (185, 2, 190.00, 95.00, 34, 22, 1);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (69.5, 1, 45.00, 45.00, 35, 23, 5);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (798, 1, 520.00, 520.00, 36, 24, 22);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (150, 1, 120.00, 120.00, 37, 25, 33);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (798, 1, 520.00, 520.00, 38, 26, 22);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (340, 1, 175.00, 175.00, 39, 26, 4);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (595, 1, 540.00, 540.00, 40, 26, 31);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (69.5, 1, 45.00, 45.00, 41, 27, 7);
INSERT INTO order_items (price, quantity, total_cogs, unit_cost, id, order_id, product_id) VALUES (300, 5, 1230.00, 246.00, 42, 28, 34);

-- 2.14 WHOLESALE ORDERS (8 rows)
INSERT INTO wholesale_orders (total_amount, buyer_id, id, order_date, update_date, user_id, status) VALUES (2600, 1, 1, '2026-10-08 10:00:00', '2026-10-08 10:05:00', 1, 'COMPLETED');
INSERT INTO wholesale_orders (total_amount, buyer_id, id, order_date, update_date, user_id, status) VALUES (825, 1, 2, '2026-10-16 14:00:00', '2026-10-16 14:10:00', 1, 'COMPLETED');
INSERT INTO wholesale_orders (total_amount, buyer_id, id, order_date, update_date, user_id, status) VALUES (3250, 1, 3, '2026-10-18 16:30:00', '2026-10-18 16:45:00', 1, 'COMPLETED');
INSERT INTO wholesale_orders (total_amount, buyer_id, id, order_date, update_date, user_id, status) VALUES (2080, 1, 4, '2026-10-20 11:00:00', '2026-10-20 11:20:00', 1, 'COMPLETED');
INSERT INTO wholesale_orders (total_amount, buyer_id, id, order_date, update_date, user_id, status) VALUES (550, 1, 5, '2026-10-21 13:00:00', '2026-10-21 13:15:00', 1, 'COMPLETED');
INSERT INTO wholesale_orders (total_amount, buyer_id, id, order_date, update_date, user_id, status) VALUES (1040, 1, 6, '2026-10-22 07:10:00', '2026-10-22 07:58:44.360539', 1, 'COMPLETED');
INSERT INTO wholesale_orders (total_amount, buyer_id, id, order_date, update_date, user_id, status) VALUES (3300, 1, 12, '2026-10-25 12:34:51.145504', '2026-10-25 12:34:55.712278', 1, 'COMPLETED');
INSERT INTO wholesale_orders (total_amount, buyer_id, id, order_date, update_date, user_id, status) VALUES (300.5, 14, 13, '2026-10-25 20:04:32.639841', '2026-10-25 20:04:59.857766', 1, 'COMPLETED');

-- 2.15 WHOLESALE ORDER ITEMS (9 rows)
INSERT INTO wholesale_order_items (quantity, total_cogs, unit_cost, wholesale_price, id, product_id, wholesale_order_id) VALUES (5, 2600.00, 520.00, 650, 5, 22, 3);
INSERT INTO wholesale_order_items (quantity, total_cogs, unit_cost, wholesale_price, id, product_id, wholesale_order_id) VALUES (10, 450.00, 45.00, 55, 7, 7, 5);
INSERT INTO wholesale_order_items (quantity, total_cogs, unit_cost, wholesale_price, id, product_id, wholesale_order_id) VALUES (10, 2100.00, 210.00, 260, 3, 6, 1);
INSERT INTO wholesale_order_items (quantity, total_cogs, unit_cost, wholesale_price, id, product_id, wholesale_order_id) VALUES (8, 1680.00, 210.00, 260, 6, 6, 4);
INSERT INTO wholesale_order_items (quantity, total_cogs, unit_cost, wholesale_price, id, product_id, wholesale_order_id) VALUES (4, 840.00, 210.00, 260, 8, 6, 6);
INSERT INTO wholesale_order_items (quantity, total_cogs, unit_cost, wholesale_price, id, product_id, wholesale_order_id) VALUES (15, 675.00, 45.00, 55, 4, 5, 2);
INSERT INTO wholesale_order_items (quantity, total_cogs, unit_cost, wholesale_price, id, product_id, wholesale_order_id) VALUES (10, 3190.00, 319.00, 330, 22, 6, 12);
INSERT INTO wholesale_order_items (quantity, total_cogs, unit_cost, wholesale_price, id, product_id, wholesale_order_id) VALUES (1, 240.00, 240.00, 230, 23, 34, 13);
INSERT INTO wholesale_order_items (quantity, total_cogs, unit_cost, wholesale_price, id, product_id, wholesale_order_id) VALUES (1, 45.00, 45.00, 70.5, 24, 7, 13);

-- 2.16 CARTS (2 rows)
INSERT INTO carts (created_at, id, updated_at, user_id) VALUES ('2026-10-22 07:18:21.376946', 1, '2026-10-22 07:18:21.376946', 2);
INSERT INTO carts (created_at, id, updated_at, user_id) VALUES ('2026-10-23 09:24:03.676877', 3, '2026-10-23 09:24:03.676877', 3);

-- 2.17 CART ITEMS (1 rows)
INSERT INTO cart_items (quantity, cart_id, id, product_id) VALUES (1, 3, 18, 31);

-- 2.18 WISHLIST ITEMS (5 rows)
INSERT INTO wishlist_items (created_at, id, product_id, user_id) VALUES ('2026-10-25 11:56:07.237528', 2, 22, 2);
INSERT INTO wishlist_items (created_at, id, product_id, user_id) VALUES ('2026-10-25 12:28:49.887528', 4, 6, 3);
INSERT INTO wishlist_items (created_at, id, product_id, user_id) VALUES ('2026-10-25 19:23:01.106677', 5, 31, 2);
INSERT INTO wishlist_items (created_at, id, product_id, user_id) VALUES ('2026-10-25 19:23:02.114463', 6, 7, 2);
INSERT INTO wishlist_items (created_at, id, product_id, user_id) VALUES ('2026-10-25 19:59:08.975149', 7, 31, 3);

-- ----------------------------------------------------------------------------
-- 3. RESET ALL SERIAL / IDENTITY SEQUENCES
-- ----------------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval(pg_get_serial_sequence('categories', 'id'), COALESCE((SELECT MAX(id) FROM categories), 1));
SELECT setval(pg_get_serial_sequence('brands', 'id'), COALESCE((SELECT MAX(id) FROM brands), 1));
SELECT setval(pg_get_serial_sequence('suppliers', 'id'), COALESCE((SELECT MAX(id) FROM suppliers), 1));
SELECT setval(pg_get_serial_sequence('wholesale_buyers', 'id'), COALESCE((SELECT MAX(id) FROM wholesale_buyers), 1));
SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE((SELECT MAX(id) FROM products), 1));
SELECT setval(pg_get_serial_sequence('product_images', 'id'), COALESCE((SELECT MAX(id) FROM product_images), 1));
SELECT setval(pg_get_serial_sequence('purchase_orders', 'id'), COALESCE((SELECT MAX(id) FROM purchase_orders), 1));
SELECT setval(pg_get_serial_sequence('purchase_order_items', 'id'), COALESCE((SELECT MAX(id) FROM purchase_order_items), 1));
SELECT setval(pg_get_serial_sequence('stock_batches', 'id'), COALESCE((SELECT MAX(id) FROM stock_batches), 1));
SELECT setval(pg_get_serial_sequence('stock_movements', 'id'), COALESCE((SELECT MAX(id) FROM stock_movements), 1));
SELECT setval(pg_get_serial_sequence('orders', 'id'), COALESCE((SELECT MAX(id) FROM orders), 1));
SELECT setval(pg_get_serial_sequence('order_items', 'id'), COALESCE((SELECT MAX(id) FROM order_items), 1));
SELECT setval(pg_get_serial_sequence('wholesale_orders', 'id'), COALESCE((SELECT MAX(id) FROM wholesale_orders), 1));
SELECT setval(pg_get_serial_sequence('wholesale_order_items', 'id'), COALESCE((SELECT MAX(id) FROM wholesale_order_items), 1));
SELECT setval(pg_get_serial_sequence('carts', 'id'), COALESCE((SELECT MAX(id) FROM carts), 1));
SELECT setval(pg_get_serial_sequence('cart_items', 'id'), COALESCE((SELECT MAX(id) FROM cart_items), 1));
SELECT setval(pg_get_serial_sequence('wishlist_items', 'id'), COALESCE((SELECT MAX(id) FROM wishlist_items), 1));

COMMIT;
