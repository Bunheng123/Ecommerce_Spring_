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

        User stock = userRepository.findByUsername("stock").orElseGet(() -> User.builder()
                .username("stock")
                .email("stock@example.com")
                .role(Role.STOCK)
                .build());
        stock.setPassword(passwordEncoder.encode("stock123"));
        stock.setRole(Role.STOCK);
        userRepository.save(stock);
        log.info("Default STOCK user ready: username='stock', password='stock123', role='STOCK'");

        User customer = userRepository.findByUsername("customer1").orElseGet(() -> User.builder()
                .username("customer1")
                .email("customer1@example.com")
                .role(Role.USER)
                .build());
        customer.setPassword(passwordEncoder.encode("customer123"));
        customer.setRole(Role.USER);
        userRepository.save(customer);
        log.info("Default USER ready: username='customer1', password='customer123', role='USER'");
    }
}
