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
        } catch (Exception e) {
            log.warn("Could not update users_role_check constraint: {}", e.getMessage());
        }

        User admin = userRepository.findByUsername("admin").orElseGet(() -> User.builder()
                .username("admin")
                .email("admin@example.com")
                .role(Role.ADMIN)
                .build());
        admin.setPassword(passwordEncoder.encode("admin123"));
        admin.setRole(Role.ADMIN);
        userRepository.save(admin);
        log.info("Default ADMIN user ready: username='admin', password='admin123', role='ADMIN'");

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
