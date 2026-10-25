BEGIN;

-- 1. Ensure Brands & Categories exist for the 4 Hero Pieces
INSERT INTO brands (name, description, created_at, updated_at)
VALUES ('CTRL', 'Contemporary elevated essentials and statement silhouettes', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (col_name, description, created_at, updated_at)
VALUES 
  ('Knitwear & Hoodies', 'Heavyweight knits, vintage fleeces, and statement tops', NOW(), NOW()),
  ('Denim & Tailoring', 'Archival denim, structured trousers, and raw-hem blazers', NOW(), NOW())
ON CONFLICT (col_name) DO NOTHING;

-- 2. Drop Foreign Key Constraints referencing products(id) so IDs can be safely remapped
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS fk1re40cjegsfvw58xrkdp6bac6;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS fkocimc7dtr037rh4ls4l95nlfi;
ALTER TABLE product_images DROP CONSTRAINT IF EXISTS fkqnq71xsohugpqwf3c9gxmsuy;
ALTER TABLE purchase_order_items DROP CONSTRAINT IF EXISTS fks16e5vrvsp8alu0xp8m3a2ol5;
ALTER TABLE stock_batches DROP CONSTRAINT IF EXISTS fkde4mxi94h28dwxdtr6lg8umfs;
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS fkjcaag8ogfjxpwmqypi1wfdaog;
ALTER TABLE wholesale_order_items DROP CONSTRAINT IF EXISTS fkgrhp2kc3t97i3m4itpnlb0tl4;
ALTER TABLE wishlist_items DROP CONSTRAINT IF EXISTS fkqxj7lncd242b59fb78rqegyxj;

-- 3. Remap existing products: 4 -> 7, 2 -> 6, 1 -> 5 (Product 22 stays 22, Product 31 stays 31)
UPDATE products SET id = 7 WHERE id = 4;
UPDATE products SET id = 6 WHERE id = 2;
UPDATE products SET id = 5 WHERE id = 1;

-- 4. Update product_id across all 8 referencing tables to maintain 100% integrity
-- order_items
UPDATE order_items SET product_id = 7 WHERE product_id = 4;
UPDATE order_items SET product_id = 6 WHERE product_id = 2;
UPDATE order_items SET product_id = 5 WHERE product_id = 1;

-- wholesale_order_items
UPDATE wholesale_order_items SET product_id = 7 WHERE product_id = 4;
UPDATE wholesale_order_items SET product_id = 6 WHERE product_id = 2;
UPDATE wholesale_order_items SET product_id = 5 WHERE product_id = 1;

-- purchase_order_items
UPDATE purchase_order_items SET product_id = 7 WHERE product_id = 4;
UPDATE purchase_order_items SET product_id = 6 WHERE product_id = 2;
UPDATE purchase_order_items SET product_id = 5 WHERE product_id = 1;

-- stock_batches
UPDATE stock_batches SET product_id = 7 WHERE product_id = 4;
UPDATE stock_batches SET product_id = 6 WHERE product_id = 2;
UPDATE stock_batches SET product_id = 5 WHERE product_id = 1;

-- stock_movements
UPDATE stock_movements SET product_id = 7 WHERE product_id = 4;
UPDATE stock_movements SET product_id = 6 WHERE product_id = 2;
UPDATE stock_movements SET product_id = 5 WHERE product_id = 1;

-- product_images
UPDATE product_images SET product_id = 7 WHERE product_id = 4;
UPDATE product_images SET product_id = 6 WHERE product_id = 2;
UPDATE product_images SET product_id = 5 WHERE product_id = 1;

-- cart_items
UPDATE cart_items SET product_id = 7 WHERE product_id = 4;
UPDATE cart_items SET product_id = 6 WHERE product_id = 2;
UPDATE cart_items SET product_id = 5 WHERE product_id = 1;

-- wishlist_items
UPDATE wishlist_items SET product_id = 7 WHERE product_id = 4;
UPDATE wishlist_items SET product_id = 6 WHERE product_id = 2;
UPDATE wishlist_items SET product_id = 5 WHERE product_id = 1;

-- 5. Insert the 4 "THE NEW ERA" Hero Rail Garments as Product IDs 1, 2, 3, 4
-- ID #1: Distressed CTRL Knit Sweater
INSERT INTO products (id, name, price, cost_price, stock, reorder_level, active, category_id, brand_id, image_url, public_id, description)
VALUES (
  1,
  'Distressed CTRL Knit Sweater',
  185.00,
  95.00,
  18,
  5,
  true,
  (SELECT id FROM categories WHERE col_name = 'Knitwear & Hoodies' LIMIT 1),
  (SELECT id FROM brands WHERE name = 'CTRL' LIMIT 1),
  '/hero-rail/sweater.png',
  'hero-rail/sweater',
  'Heavyweight distressed knit sweater crafted with raw edge ribbing and drop shoulders.'
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

-- ID #2: Washed CTRL Graphic Hoodie
INSERT INTO products (id, name, price, cost_price, stock, reorder_level, active, category_id, brand_id, image_url, public_id, description)
VALUES (
  2,
  'Washed CTRL Graphic Hoodie',
  165.00,
  85.00,
  24,
  5,
  true,
  (SELECT id FROM categories WHERE col_name = 'Knitwear & Hoodies' LIMIT 1),
  (SELECT id FROM brands WHERE name = 'CTRL' LIMIT 1),
  '/hero-rail/hoodie.png',
  'hero-rail/hoodie',
  'Vintage washed heavyweight fleece hoodie featuring custom CTRL graphic and metal aglets.'
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

-- ID #3: Arcene Wide Leg Washed Denim
INSERT INTO products (id, name, price, cost_price, stock, reorder_level, active, category_id, brand_id, image_url, public_id, description)
VALUES (
  3,
  'Arcene Wide Leg Washed Denim',
  210.00,
  110.00,
  15,
  5,
  true,
  (SELECT id FROM categories WHERE col_name = 'Denim & Tailoring' LIMIT 1),
  (SELECT id FROM brands WHERE name = 'CTRL' LIMIT 1),
  '/hero-rail/denim.png',
  'hero-rail/denim',
  'Wide-leg baggy washed denim jeans featuring reinforced belt loops and copper rivet hardware.'
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

-- ID #4: CTRL Raw-Hem Tailored Blazer
INSERT INTO products (id, name, price, cost_price, stock, reorder_level, active, category_id, brand_id, image_url, public_id, description)
VALUES (
  4,
  'CTRL Raw-Hem Tailored Blazer',
  340.00,
  175.00,
  10,
  4,
  true,
  (SELECT id FROM categories WHERE col_name = 'Denim & Tailoring' LIMIT 1),
  (SELECT id FROM brands WHERE name = 'CTRL' LIMIT 1),
  '/hero-rail/blazer.png',
  'hero-rail/blazer',
  'Architectural tailored double-breasted blazer with sharp peak lapels and a deconstructed raw hem.'
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

-- 6. Seed Product Images for Products 1, 2, 3, 4
DELETE FROM product_images WHERE product_id IN (1, 2, 3, 4);
INSERT INTO product_images (product_id, image_url, public_id, is_primary, created_at)
VALUES
  (1, '/hero-rail/sweater.png', 'hero-rail/sweater', true, NOW()),
  (2, '/hero-rail/hoodie.png', 'hero-rail/hoodie', true, NOW()),
  (3, '/hero-rail/denim.png', 'hero-rail/denim', true, NOW()),
  (4, '/hero-rail/blazer.png', 'hero-rail/blazer', true, NOW());

-- 7. Seed Initial FIFO Stock Batches for Products 1, 2, 3, 4
DELETE FROM stock_batches WHERE batch_number IN ('BATCH-INIT-1', 'BATCH-INIT-2', 'BATCH-INIT-3', 'BATCH-INIT-4');
INSERT INTO stock_batches (batch_number, product_id, initial_quantity, remaining_quantity, unit_cost, status, received_date)
VALUES
  ('BATCH-INIT-1', 1, 18, 18, 95.00, 'ACTIVE', NOW()),
  ('BATCH-INIT-2', 2, 24, 24, 85.00, 'ACTIVE', NOW()),
  ('BATCH-INIT-3', 3, 15, 15, 110.00, 'ACTIVE', NOW()),
  ('BATCH-INIT-4', 4, 10, 10, 175.00, 'ACTIVE', NOW());

-- 8. Seed Initial Stock Movements for Products 1, 2, 3, 4
INSERT INTO stock_movements (product_id, user_id, type, quantity, previous_stock, new_stock, reason, created_at)
VALUES
  (1, 1, 'STOCK_IN', 18, 0, 18, 'Initial supplier batch arrival - Hero Collection', NOW()),
  (2, 1, 'STOCK_IN', 24, 0, 24, 'Initial supplier batch arrival - Hero Collection', NOW()),
  (3, 1, 'STOCK_IN', 15, 0, 15, 'Initial supplier batch arrival - Hero Collection', NOW()),
  (4, 1, 'STOCK_IN', 10, 0, 10, 'Initial supplier batch arrival - Hero Collection', NOW());

-- 9. Re-add Foreign Key Constraints referencing products(id)
ALTER TABLE cart_items ADD CONSTRAINT fk1re40cjegsfvw58xrkdp6bac6 FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE order_items ADD CONSTRAINT fkocimc7dtr037rh4ls4l95nlfi FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE product_images ADD CONSTRAINT fkqnq71xsohugpqwf3c9gxmsuy FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE purchase_order_items ADD CONSTRAINT fks16e5vrvsp8alu0xp8m3a2ol5 FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE stock_batches ADD CONSTRAINT fkde4mxi94h28dwxdtr6lg8umfs FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE stock_movements ADD CONSTRAINT fkjcaag8ogfjxpwmqypi1wfdaog FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE wholesale_order_items ADD CONSTRAINT fkgrhp2kc3t97i3m4itpnlb0tl4 FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE wishlist_items ADD CONSTRAINT fkqxj7lncd242b59fb78rqegyxj FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- 10. Advance products sequence past all current product IDs
SELECT setval(pg_get_serial_sequence('products', 'id'), GREATEST((SELECT MAX(id) FROM products), 22) + 1);

COMMIT;
