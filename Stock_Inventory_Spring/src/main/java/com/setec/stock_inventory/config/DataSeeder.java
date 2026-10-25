package com.setec.stock_inventory.config;

import com.setec.stock_inventory.entity.User;
import com.setec.stock_inventory.enums.Role;
import com.setec.stock_inventory.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;
    private final com.setec.stock_inventory.service.StockBatchService stockBatchService;

    @Override
    public void run(String... args) {
        try {
            jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;");
            jdbcTemplate.execute("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'STOCK', 'USER'));");
            jdbcTemplate.execute("ALTER TABLE users DROP COLUMN IF EXISTS address;");
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal numeric(12,2);");
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost numeric(12,2) DEFAULT 0.00;");
            jdbcTemplate.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount numeric(12,2) DEFAULT 0.00;");
            jdbcTemplate.execute("ALTER TABLE orders ALTER COLUMN total_amount TYPE numeric(12,2) USING round(total_amount::numeric, 2);");
            jdbcTemplate.execute("UPDATE orders SET subtotal = total_amount WHERE subtotal IS NULL;");
            jdbcTemplate.execute("UPDATE orders SET shipping_cost = 0.00 WHERE shipping_cost IS NULL;");
            jdbcTemplate.execute("UPDATE orders SET tax_amount = 0.00 WHERE tax_amount IS NULL;");
            jdbcTemplate.execute("UPDATE users SET email = 'hengheng514.514@gmail.com' WHERE email = 'hengheng513.513@gmail.com' AND user_name != 'admin';");
            jdbcTemplate.execute("UPDATE users SET email = 'hengheng513.513@gmail.com' WHERE user_name = 'admin';");
            jdbcTemplate.execute("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_cost numeric(12,2);");
            jdbcTemplate.execute("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_cogs numeric(12,2);");
            jdbcTemplate.execute("ALTER TABLE wholesale_order_items ADD COLUMN IF NOT EXISTS unit_cost numeric(12,2);");
            jdbcTemplate.execute("ALTER TABLE wholesale_order_items ADD COLUMN IF NOT EXISTS total_cogs numeric(12,2);");
            jdbcTemplate.execute("""
                UPDATE order_items oi
                SET unit_cost = ROUND(COALESCE(p.cost_price, 0)::numeric, 2),
                    total_cogs = ROUND((COALESCE(p.cost_price, 0) * oi.quantity)::numeric, 2)
                FROM products p
                WHERE oi.product_id = p.id AND oi.total_cogs IS NULL;
            """);
            jdbcTemplate.execute("""
                UPDATE wholesale_order_items woi
                SET unit_cost = ROUND(COALESCE(p.cost_price, 0)::numeric, 2),
                    total_cogs = ROUND((COALESCE(p.cost_price, 0) * woi.quantity)::numeric, 2)
                FROM products p
                WHERE woi.product_id = p.id AND woi.total_cogs IS NULL;
            """);

            // Ensure CTRL brand and Hero categories exist
            jdbcTemplate.execute("""
                INSERT INTO brands (name, description, created_at, updated_at)
                VALUES ('CTRL', 'Contemporary elevated essentials and statement silhouettes', NOW(), NOW())
                ON CONFLICT (name) DO NOTHING;
            """);
            jdbcTemplate.execute("""
                INSERT INTO categories (col_name, description, created_at, updated_at)
                VALUES 
                  ('Knitwear & Hoodies', 'Heavyweight knits, vintage fleeces, and statement tops', NOW(), NOW()),
                  ('Denim & Tailoring', 'Archival denim, structured trousers, and raw-hem blazers', NOW(), NOW())
                ON CONFLICT (col_name) DO NOTHING;
            """);
        } catch (Exception e) {
            log.warn("Could not execute startup schema updates: {}", e.getMessage());
        }

        userRepository.findByUsername("customer2").ifPresent(c2 -> {
            if (!"hengheng514.514@gmail.com".equalsIgnoreCase(c2.getEmail())) {
                c2.setEmail("hengheng514.514@gmail.com");
                userRepository.save(c2);
            }
        });

        User admin = userRepository.findByUsername("admin").orElseGet(() -> User.builder()
                .username("admin")
                .email("hengheng513.513@gmail.com")
                .role(Role.ADMIN)
                .build());
        admin.setPassword(passwordEncoder.encode("admin123"));
        admin.setRole(Role.ADMIN);
        admin.setEmail("hengheng513.513@gmail.com");
        userRepository.save(admin);
        log.info("Default ADMIN user ready: username='admin', password='admin123', email='hengheng513.513@gmail.com', role='ADMIN'");

        User customer2 = userRepository.findByUsername("customer2").orElseGet(() -> User.builder()
                .username("customer2")
                .email("bunheng2209@example.com")
                .role(Role.USER)
                .build());
        customer2.setPassword(passwordEncoder.encode("1234"));
        customer2.setRole(Role.USER);
        userRepository.save(customer2);
        log.info("Default CUSTOMER user ready: username='customer2', password='1234', role='USER'");

        User customer1 = userRepository.findByUsername("customer1").orElseGet(() -> User.builder()
                .username("customer1")
                .email("heng513.513@gmail.com")
                .role(Role.USER)
                .build());
        customer1.setPassword(passwordEncoder.encode("1234"));
        customer1.setRole(Role.USER);
        userRepository.save(customer1);
        log.info("Default USER ready: username='customer1', password='1234', role='USER'");

        try {
            stockBatchService.backfillInitialBatches();
        } catch (Exception e) {
            log.error("Failed to backfill initial stock batches: {}", e.getMessage());
        }
    }
}
