package com.setec.stock_inventory.config;

import com.setec.stock_inventory.security.CustomUserDetailsService;
import com.setec.stock_inventory.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) ->
                                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, authException.getMessage())
                        )
                )
                .authorizeHttpRequests(auth -> auth
                        // Allow CORS preflight OPTIONS requests globally
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/**", "/error").permitAll()
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**"
                        ).permitAll()
                        // Low stock and admin product catalog endpoints: ADMIN and STOCK only
                        .requestMatchers(HttpMethod.GET, "/api/products/low-stock").hasAnyRole("ADMIN", "STOCK")
                        .requestMatchers(HttpMethod.GET, "/api/products/admin").hasAnyRole("ADMIN", "STOCK")
                        // Product & Category browsing: public to everyone including anonymous
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/categories",
                                "/api/categories/**",
                                "/api/products",
                                "/api/products/**"
                        ).permitAll()
                        // Product & Category management (create, update, delete, stock adjust/in/out, images): ADMIN and STOCK only
                        .requestMatchers(
                                "/api/categories",
                                "/api/categories/**",
                                "/api/products",
                                "/api/products/**"
                        ).hasAnyRole("ADMIN", "STOCK")
                        // Suppliers: all methods allowed for ADMIN and STOCK only
                        .requestMatchers("/api/suppliers/**").hasAnyRole("ADMIN", "STOCK")
                        // Purchase Orders: all methods allowed for ADMIN and STOCK only
                        .requestMatchers("/api/purchase-orders/**").hasAnyRole("ADMIN", "STOCK")
                        // Stock Movements: read endpoints allowed for ADMIN and STOCK only
                        .requestMatchers("/api/stock-movements/**").hasAnyRole("ADMIN", "STOCK")
                        // Cart: USER only
                        .requestMatchers("/api/cart", "/api/cart/**").hasRole("USER")
                        // Order payment status: ADMIN only
                        .requestMatchers(HttpMethod.PUT, "/api/orders/*/payment-status").hasRole("ADMIN")
                        // Order self-cancellation: USER only
                        .requestMatchers(HttpMethod.POST, "/api/orders/*/cancel").hasRole("USER")
                        // User's own orders: USER (and staff)
                        .requestMatchers(HttpMethod.GET, "/api/orders/my").hasAnyRole("ADMIN", "STOCK", "USER")
                        // Specific order view: ADMIN, STOCK, USER (service checks ownership for USER)
                        .requestMatchers(HttpMethod.GET, "/api/orders/*").hasAnyRole("ADMIN", "STOCK", "USER")
                        // Orders: all other methods/endpoints allowed for ADMIN and STOCK only
                        .requestMatchers(
                                "/api/orders",
                                "/api/orders/**"
                        ).hasAnyRole("ADMIN", "STOCK")
                        // Wholesale Buyers: all methods allowed for ADMIN and STOCK only
                        .requestMatchers("/api/wholesale-buyers/**").hasAnyRole("ADMIN", "STOCK")
                        // Wholesale Orders: all methods allo
                        // wed for ADMIN and STOCK only
                        .requestMatchers("/api/wholesale-orders/**").hasAnyRole("ADMIN", "STOCK")
                        // Any authenticated user can manage their own profile
                        .requestMatchers("/api/users/me", "/api/users/me/**").authenticated()
                        // Managing all other users (creating, listing, deleting) remains ADMIN only
                        .requestMatchers("/api/users/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
