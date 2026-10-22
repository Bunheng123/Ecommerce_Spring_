BEGIN;

-- 1. Clean child tables in strict foreign key order
DELETE FROM cart_items;
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

-- 2. Clean up products except the 4 core IDs
DELETE FROM products WHERE id NOT IN (1, 2, 4, 22);

-- 3. Clean up brands & categories
DELETE FROM categories WHERE id NOT IN (1, 2);
UPDATE categories SET col_name = 'Shirts', description = 'Shirts & Tops' WHERE id = 1;
UPDATE categories SET col_name = 'Jackets', description = 'Jackets & Outerwear' WHERE id = 2;

DELETE FROM brands WHERE id NOT IN (1, 2, 3);
UPDATE brands SET name = 'Ralph Lauren', description = 'Classic American Luxury' WHERE id = 1;
UPDATE brands SET name = 'Helmut Lang', description = 'Contemporary Minimalist Fashion' WHERE id = 2;
INSERT INTO brands (id, name, description, created_at, updated_at)
VALUES (3, 'Nike', 'Athletic and Sportswear', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 4. Seed or Update the 4 Core Products with exact IDs: 1, 2, 4, 22
-- ID #1: Logo Cotton Jersey T-Shirt (Shirts, Ralph Lauren, Price: $69.50, Cost: $45.00)
INSERT INTO products (id, name, price, cost_price, stock, reorder_level, active, category_id, brand_id, image_url, public_id, description)
VALUES (
  1,
  'Logo Cotton Jersey T-Shirt',
  69.50,
  45.00,
  45,
  10,
  true,
  1,
  1,
  'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792594930/stock_inventory/image/lb2zpzbpe6uq3onv5go7.jpg',
  'stock_inventory/image/lb2zpzbpe6uq3onv5go7',
  'Crafted of cotton jersey, this Polo Ralph Lauren crewneck T-shirt is detailed with contrast logo appliqué at the chest.'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  cost_price = EXCLUDED.cost_price,
  stock = EXCLUDED.stock,
  reorder_level = EXCLUDED.reorder_level,
  active = EXCLUDED.active,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  image_url = EXCLUDED.image_url,
  public_id = EXCLUDED.public_id,
  description = EXCLUDED.description;

-- ID #2: Men's Logo Cotton Jacket (Jackets, Helmut Lang, Price: $328.50, Cost: $210.00)
INSERT INTO products (id, name, price, cost_price, stock, reorder_level, active, category_id, brand_id, image_url, public_id, description)
VALUES (
  2,
  'Men''s Logo Cotton Jacket',
  328.50,
  210.00,
  35,
  10,
  true,
  2,
  2,
  'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792595157/stock_inventory/image/xtqutuc1drll6srwale1.jpg',
  'stock_inventory/image/xtqutuc1drll6srwale1',
  'This Helmut Lang jacket, crafted of cotton in Italy, features a point collar, drop shoulders, and subtle logo detailing.'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  cost_price = EXCLUDED.cost_price,
  stock = EXCLUDED.stock,
  reorder_level = EXCLUDED.reorder_level,
  active = EXCLUDED.active,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  image_url = EXCLUDED.image_url,
  public_id = EXCLUDED.public_id,
  description = EXCLUDED.description;

-- ID #4: Men's Jersey Knit Logo T-Shirt (Shirts, Ralph Lauren, Price: $69.50, Cost: $45.00)
INSERT INTO products (id, name, price, cost_price, stock, reorder_level, active, category_id, brand_id, image_url, public_id, description)
VALUES (
  4,
  'Men''s Jersey Knit Logo T-Shirt',
  69.50,
  45.00,
  40,
  10,
  true,
  1,
  1,
  'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792595183/stock_inventory/image/vmcpszdgcy8qqbdrwp2l.jpg',
  'stock_inventory/image/vmcpszdgcy8qqbdrwp2l',
  'This cotton T-shirt features the "New York" logo across the chest, celebrating both the label''s and the founder''s home state.'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  cost_price = EXCLUDED.cost_price,
  stock = EXCLUDED.stock,
  reorder_level = EXCLUDED.reorder_level,
  active = EXCLUDED.active,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  image_url = EXCLUDED.image_url,
  public_id = EXCLUDED.public_id,
  description = EXCLUDED.description;

-- ID #22: Men's Wool Trucker Jacket (Jackets, Helmut Lang, Price: $798.00, Cost: $520.00)
INSERT INTO products (id, name, price, cost_price, stock, reorder_level, active, category_id, brand_id, image_url, public_id, description)
VALUES (
  22,
  'Men''s Wool Trucker Jacket',
  798.00,
  520.00,
  25,
  10,
  true,
  2,
  2,
  'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792595568/stock_inventory/image/l5jnmx306qle6uifhsso.jpg',
  'stock_inventory/image/l5jnmx306qle6uifhsso',
  'Helmut Lang''s trucker jacket is crafted of wool, featuring a streamlined look with on-seam pockets and structured shoulders.'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  cost_price = EXCLUDED.cost_price,
  stock = EXCLUDED.stock,
  reorder_level = EXCLUDED.reorder_level,
  active = EXCLUDED.active,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  image_url = EXCLUDED.image_url,
  public_id = EXCLUDED.public_id,
  description = EXCLUDED.description;

SELECT setval(pg_get_serial_sequence('products', 'id'), 25);

-- 5. Product Images
INSERT INTO product_images (product_id, image_url, public_id, is_primary, created_at)
VALUES
(1, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792594957/stock_inventory/image/wswnjxgj9itoku905z38.jpg', 'stock_inventory/image/wswnjxgj9itoku905z38', false, NOW()),
(1, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792594960/stock_inventory/image/no6rihroqpnohq5a06xd.jpg', 'stock_inventory/image/no6rihroqpnohq5a06xd', false, NOW()),
(2, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792595467/stock_inventory/image/cnzkkpyme2g53srqub9f.jpg', 'stock_inventory/image/cnzkkpyme2g53srqub9f', false, NOW()),
(2, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792595482/stock_inventory/image/njezxu9tw9yzvpdc5jbi.jpg', 'stock_inventory/image/njezxu9tw9yzvpdc5jbi', false, NOW()),
(4, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792594461/stock_inventory/image/ceuypnhkqudjny11bs4t.jpg', 'stock_inventory/image/ceuypnhkqudjny11bs4t', false, NOW()),
(4, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792594464/stock_inventory/image/ql84ayunfs3vfckpun9e.jpg', 'stock_inventory/image/ql84ayunfs3vfckpun9e', false, NOW()),
(22, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792595607/stock_inventory/image/epfsk9t1oq7qokxhaskj.jpg', 'stock_inventory/image/epfsk9t1oq7qokxhaskj', false, NOW()),
(22, 'http://res.cloudinary.com/dmxtjebu5/image/upload/v1792595615/stock_inventory/image/xrdefkkhtqrfgkb7418v.jpg', 'stock_inventory/image/xrdefkkhtqrfgkb7418v', false, NOW());

-- 6. Clean Stock Batches for the 4 Products
INSERT INTO stock_batches (batch_number, product_id, initial_quantity, remaining_quantity, unit_cost, status, received_date)
VALUES
('BATCH-P1-20261010-001', 1, 100, 45, 45.00, 'ACTIVE', '2026-10-10 08:00:00'),
('BATCH-P2-20261010-001', 2, 80, 35, 210.00, 'ACTIVE', '2026-10-10 08:00:00'),
('BATCH-P4-20261010-001', 4, 90, 40, 45.00, 'ACTIVE', '2026-10-10 08:00:00'),
('BATCH-P22-20261010-001', 22, 50, 25, 520.00, 'ACTIVE', '2026-10-10 08:00:00');

-- 7. Wholesale Buyer
INSERT INTO wholesale_buyers (id, name, contact_person, email, phone, address, type, active, created_at, updated_at)
VALUES (1, 'Kante', 'Kante', 'kante@gmail.com', '+85593435035', 'No. 86A, Street 110, Russian Federation Blvd (110)', 'INDIVIDUAL', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, active = true;

-- 8. Seed Historical Retail Orders across Past Days (Using 4 Products)
-- Order 1: 20 days ago (2026-10-02) COMPLETED
INSERT INTO orders (id, user_id, order_date, update_date, status, payment_status, payment_method, shipping_address, subtotal, tax_amount, shipping_cost, total_amount)
VALUES (1, 2, '2026-10-02 10:15:00', '2026-10-02 10:30:00', 'COMPLETED', 'PAID', 'BANK_TRANSFER', 'Phnom Penh, Cambodia', 208.50, 0.00, 0.00, 208.50);
INSERT INTO order_items (order_id, product_id, quantity, price, unit_cost, total_cogs)
VALUES (1, 1, 3, 69.50, 45.00, 135.00);

-- Order 2: 6 days ago (2026-10-16) COMPLETED
INSERT INTO orders (id, user_id, order_date, update_date, status, payment_status, payment_method, shipping_address, subtotal, tax_amount, shipping_cost, total_amount)
VALUES (2, 3, '2026-10-16 11:20:00', '2026-10-16 11:35:00', 'COMPLETED', 'PAID', 'CASH_ON_DELIVERY', 'Phnom Penh, Cambodia', 139.00, 0.00, 0.00, 139.00);
INSERT INTO order_items (order_id, product_id, quantity, price, unit_cost, total_cogs)
VALUES (2, 4, 2, 69.50, 45.00, 90.00);

-- Order 3: 5 days ago (2026-10-17) COMPLETED
INSERT INTO orders (id, user_id, order_date, update_date, status, payment_status, payment_method, shipping_address, subtotal, tax_amount, shipping_cost, total_amount)
VALUES (3, 2, '2026-10-17 14:10:00', '2026-10-17 14:25:00', 'COMPLETED', 'PAID', 'BANK_TRANSFER', 'Siem Reap, Cambodia', 657.00, 0.00, 0.00, 657.00);
INSERT INTO order_items (order_id, product_id, quantity, price, unit_cost, total_cogs)
VALUES (3, 2, 2, 328.50, 210.00, 420.00);

-- Order 4: 3 days ago (2026-10-19) COMPLETED
INSERT INTO orders (id, user_id, order_date, update_date, status, payment_status, payment_method, shipping_address, subtotal, tax_amount, shipping_cost, total_amount)
VALUES (4, 3, '2026-10-19 16:40:00', '2026-10-19 17:00:00', 'COMPLETED', 'PAID', 'BANK_TRANSFER', 'Phnom Penh, Cambodia', 798.00, 0.00, 0.00, 798.00);
INSERT INTO order_items (order_id, product_id, quantity, price, unit_cost, total_cogs)
VALUES (4, 22, 1, 798.00, 520.00, 520.00);

-- Order 5: 2 days ago (2026-10-20) COMPLETED
INSERT INTO orders (id, user_id, order_date, update_date, status, payment_status, payment_method, shipping_address, subtotal, tax_amount, shipping_cost, total_amount)
VALUES (5, 2, '2026-10-20 09:30:00', '2026-10-20 10:00:00', 'COMPLETED', 'PAID', 'CASH_ON_DELIVERY', 'Battambang, Cambodia', 417.00, 0.00, 0.00, 417.00);
INSERT INTO order_items (order_id, product_id, quantity, price, unit_cost, total_cogs)
VALUES (5, 1, 4, 69.50, 45.00, 180.00),
       (5, 4, 2, 69.50, 45.00, 90.00);

-- Order 6: yesterday (2026-10-21) COMPLETED
INSERT INTO orders (id, user_id, order_date, update_date, status, payment_status, payment_method, shipping_address, subtotal, tax_amount, shipping_cost, total_amount)
VALUES (6, 3, '2026-10-21 15:00:00', '2026-10-21 15:30:00', 'COMPLETED', 'PAID', 'BANK_TRANSFER', 'Phnom Penh, Cambodia', 467.50, 0.00, 0.00, 467.50);
INSERT INTO order_items (order_id, product_id, quantity, price, unit_cost, total_cogs)
VALUES (6, 2, 1, 328.50, 210.00, 210.00),
       (6, 1, 2, 69.50, 45.00, 90.00);

-- Order 7: today (2026-10-22) COMPLETED
INSERT INTO orders (id, user_id, order_date, update_date, status, payment_status, payment_method, shipping_address, subtotal, tax_amount, shipping_cost, total_amount)
VALUES (7, 2, '2026-10-22 06:15:00', '2026-10-22 06:30:00', 'COMPLETED', 'PAID', 'BANK_TRANSFER', 'Phnom Penh, Cambodia', 798.00, 0.00, 0.00, 798.00);
INSERT INTO order_items (order_id, product_id, quantity, price, unit_cost, total_cogs)
VALUES (7, 22, 1, 798.00, 520.00, 520.00);

-- Order 8: today (2026-10-22) PENDING (Retail Pending order)
INSERT INTO orders (id, user_id, order_date, update_date, status, payment_status, payment_method, shipping_address, subtotal, tax_amount, shipping_cost, total_amount)
VALUES (8, 3, '2026-10-22 07:05:00', '2026-10-22 07:05:00', 'PENDING', 'UNPAID', 'BANK_TRANSFER', 'Phnom Penh, Cambodia', 69.50, 0.00, 0.00, 69.50);
INSERT INTO order_items (order_id, product_id, quantity, price, unit_cost, total_cogs)
VALUES (8, 1, 1, 69.50, 45.00, 45.00);

SELECT setval(pg_get_serial_sequence('orders', 'id'), 10);
SELECT setval(pg_get_serial_sequence('order_items', 'id'), 20);

-- 9. Seed Historical Wholesale Orders across Past Days (Using 4 Products)
-- Wholesale Order 1: 14 days ago (2026-10-08) COMPLETED
INSERT INTO wholesale_orders (id, buyer_id, user_id, order_date, update_date, status, total_amount)
VALUES (1, 1, 1, '2026-10-08 10:00:00', '2026-10-08 10:05:00', 'COMPLETED', 2600.00);
INSERT INTO wholesale_order_items (wholesale_order_id, product_id, quantity, wholesale_price, unit_cost, total_cogs)
VALUES (1, 2, 10, 260.00, 210.00, 2100.00);

-- Wholesale Order 2: 6 days ago (2026-10-16) COMPLETED
INSERT INTO wholesale_orders (id, buyer_id, user_id, order_date, update_date, status, total_amount)
VALUES (2, 1, 1, '2026-10-16 14:00:00', '2026-10-16 14:10:00', 'COMPLETED', 825.00);
INSERT INTO wholesale_order_items (wholesale_order_id, product_id, quantity, wholesale_price, unit_cost, total_cogs)
VALUES (2, 1, 15, 55.00, 45.00, 675.00);

-- Wholesale Order 3: 4 days ago (2026-10-18) COMPLETED
INSERT INTO wholesale_orders (id, buyer_id, user_id, order_date, update_date, status, total_amount)
VALUES (3, 1, 1, '2026-10-18 16:30:00', '2026-10-18 16:45:00', 'COMPLETED', 3250.00);
INSERT INTO wholesale_order_items (wholesale_order_id, product_id, quantity, wholesale_price, unit_cost, total_cogs)
VALUES (3, 22, 5, 650.00, 520.00, 2600.00);

-- Wholesale Order 4: 2 days ago (2026-10-20) COMPLETED
INSERT INTO wholesale_orders (id, buyer_id, user_id, order_date, update_date, status, total_amount)
VALUES (4, 1, 1, '2026-10-20 11:00:00', '2026-10-20 11:20:00', 'COMPLETED', 2080.00);
INSERT INTO wholesale_order_items (wholesale_order_id, product_id, quantity, wholesale_price, unit_cost, total_cogs)
VALUES (4, 2, 8, 260.00, 210.00, 1680.00);

-- Wholesale Order 5: yesterday (2026-10-21) COMPLETED
INSERT INTO wholesale_orders (id, buyer_id, user_id, order_date, update_date, status, total_amount)
VALUES (5, 1, 1, '2026-10-21 13:00:00', '2026-10-21 13:15:00', 'COMPLETED', 550.00);
INSERT INTO wholesale_order_items (wholesale_order_id, product_id, quantity, wholesale_price, unit_cost, total_cogs)
VALUES (5, 4, 10, 55.00, 45.00, 450.00);

-- Wholesale Order 6: today (2026-10-22) PENDING (Wholesale Pending order awaiting action)
INSERT INTO wholesale_orders (id, buyer_id, user_id, order_date, update_date, status, total_amount)
VALUES (6, 1, 1, '2026-10-22 07:10:00', '2026-10-22 07:10:00', 'PENDING', 1040.00);
INSERT INTO wholesale_order_items (wholesale_order_id, product_id, quantity, wholesale_price, unit_cost, total_cogs)
VALUES (6, 2, 4, 260.00, 210.00, 840.00);

SELECT setval(pg_get_serial_sequence('wholesale_orders', 'id'), 10);
SELECT setval(pg_get_serial_sequence('wholesale_order_items', 'id'), 20);

-- 10. Log Recent Stock Movements for History
INSERT INTO stock_movements (product_id, user_id, type, quantity, previous_stock, new_stock, reason, created_at)
VALUES
(1, 1, 'STOCK_IN', 100, 0, 100, 'Initial supplier batch arrival', '2026-10-10 08:00:00'),
(2, 1, 'STOCK_IN', 80, 0, 80, 'Initial supplier batch arrival', '2026-10-10 08:00:00'),
(4, 1, 'STOCK_IN', 90, 0, 90, 'Initial supplier batch arrival', '2026-10-10 08:00:00'),
(22, 1, 'STOCK_IN', 50, 0, 50, 'Initial supplier batch arrival', '2026-10-10 08:00:00'),
(1, 2, 'STOCK_OUT', 3, 100, 97, 'Fulfilled retail order #1', '2026-10-02 10:30:00'),
(2, 1, 'STOCK_OUT', 10, 80, 70, 'Fulfilled wholesale order #1', '2026-10-08 10:05:00'),
(4, 3, 'STOCK_OUT', 2, 90, 88, 'Fulfilled retail order #2', '2026-10-16 11:35:00'),
(1, 1, 'STOCK_OUT', 15, 97, 82, 'Fulfilled wholesale order #2', '2026-10-16 14:10:00'),
(2, 2, 'STOCK_OUT', 2, 70, 68, 'Fulfilled retail order #3', '2026-10-17 14:25:00'),
(22, 1, 'STOCK_OUT', 5, 50, 45, 'Fulfilled wholesale order #3', '2026-10-18 16:45:00'),
(22, 3, 'STOCK_OUT', 1, 45, 44, 'Fulfilled retail order #4', '2026-10-19 17:00:00'),
(1, 2, 'STOCK_OUT', 4, 82, 78, 'Fulfilled retail order #5', '2026-10-20 10:00:00'),
(4, 2, 'STOCK_OUT', 2, 88, 86, 'Fulfilled retail order #5', '2026-10-20 10:00:00'),
(2, 1, 'STOCK_OUT', 8, 68, 60, 'Fulfilled wholesale order #4', '2026-10-20 11:20:00'),
(2, 3, 'STOCK_OUT', 1, 60, 59, 'Fulfilled retail order #6', '2026-10-21 15:30:00'),
(1, 3, 'STOCK_OUT', 2, 78, 76, 'Fulfilled retail order #6', '2026-10-21 15:30:00'),
(4, 1, 'STOCK_OUT', 10, 86, 76, 'Fulfilled wholesale order #5', '2026-10-21 13:15:00'),
(22, 2, 'STOCK_OUT', 1, 44, 43, 'Fulfilled retail order #7', '2026-10-22 06:30:00');

COMMIT;
