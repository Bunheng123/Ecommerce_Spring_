package com.setec.stock_inventory.service.impl;

import com.setec.stock_inventory.dto.Request.LoginRequest;
import com.setec.stock_inventory.dto.Request.RegisterRequest;
import com.setec.stock_inventory.dto.Response.LoginResponse;
import com.setec.stock_inventory.dto.Response.MessageResponse;
import com.setec.stock_inventory.entity.User;
import com.setec.stock_inventory.enums.Role;
import com.setec.stock_inventory.exception.BadRequestException;
import com.setec.stock_inventory.exception.RateLimitExceededException;
import com.setec.stock_inventory.repo.UserRepository;
import com.setec.stock_inventory.security.CustomUserDetailsService;
import com.setec.stock_inventory.security.JwtService;
import com.setec.stock_inventory.security.LoginRateLimiterService;
import com.setec.stock_inventory.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    public static final int MAX_FAILED_ATTEMPTS = 5;
    public static final int LOCKOUT_DURATION_MINUTES = 15;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final LoginRateLimiterService rateLimiterService;
    private final HttpServletRequest httpServletRequest;

    @Override
    public MessageResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already exists");
        }

        // Public registration always assigns USER role to prevent privilege escalation
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .build();

        userRepository.save(user);

        return new MessageResponse("User registered successfully");
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        // 1. IP Rate Limiting check
        String clientIp = rateLimiterService.extractClientIp(httpServletRequest);
        if (rateLimiterService.isBlocked(clientIp)) {
            long remainingSeconds = rateLimiterService.getRemainingWaitSeconds(clientIp);
            throw new RateLimitExceededException(
                    "Too many login attempts from this network. Please wait " + remainingSeconds + " seconds before trying again.",
                    remainingSeconds
            );
        }

        // 2. Resolve target user for lockout validation
        String loginIdentifier = request.getUsername() != null ? request.getUsername().trim() : "";
        User user = userRepository.findByUsername(loginIdentifier)
                .or(() -> userRepository.findByEmail(loginIdentifier))
                .orElse(null);

        if (user != null) {
            if (!user.isActive()) {
                throw new BadRequestException("Your account has been deactivated by an administrator.");
            }

            if (user.isAccountLocked()) {
                long minutesLeft = Duration.between(LocalDateTime.now(), user.getLockoutUntil()).toMinutes() + 1;
                throw new BadRequestException(
                        "Account is temporarily locked due to 5 consecutive failed login attempts. Please try again in "
                                + minutesLeft + " minute(s)."
                );
            } else if (user.getLockoutUntil() != null && user.getLockoutUntil().isBefore(LocalDateTime.now())) {
                // Lockout period expired; reset attempt counter
                user.setFailedAttempts(0);
                user.setLockoutUntil(null);
                userRepository.save(user);
            }
        }

        // 3. Attempt credentials authentication
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
        } catch (DisabledException e) {
            throw new BadRequestException("Your account has been deactivated by an administrator.");
        } catch (LockedException e) {
            throw new BadRequestException("Account is temporarily locked due to too many failed login attempts.");
        } catch (BadCredentialsException e) {
            // Record attempt for IP rate limiting
            rateLimiterService.recordAttempt(clientIp);

            if (user != null) {
                int newAttempts = user.getFailedAttempts() + 1;
                user.setFailedAttempts(newAttempts);

                if (newAttempts >= MAX_FAILED_ATTEMPTS) {
                    user.setLockoutUntil(LocalDateTime.now().plusMinutes(LOCKOUT_DURATION_MINUTES));
                    userRepository.save(user);
                    throw new BadRequestException(
                            "Account has been locked for " + LOCKOUT_DURATION_MINUTES
                                    + " minutes due to " + MAX_FAILED_ATTEMPTS + " consecutive failed login attempts."
                    );
                } else {
                    userRepository.save(user);
                    int remaining = MAX_FAILED_ATTEMPTS - newAttempts;
                    throw new BadRequestException(
                            "Invalid username or password. " + remaining + " attempt" + (remaining == 1 ? "" : "s")
                                    + " remaining before account is temporarily locked."
                    );
                }
            }

            throw new BadRequestException("Invalid username or password.");
        }

        // 4. On successful login: reset counters and clear IP rate limits
        if (user != null && (user.getFailedAttempts() > 0 || user.getLockoutUntil() != null)) {
            user.setFailedAttempts(0);
            user.setLockoutUntil(null);
            userRepository.save(user);
        }
        rateLimiterService.reset(clientIp);

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());
        String token = jwtService.generateToken(userDetails);

        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        return LoginResponse.builder()
                .username(userDetails.getUsername())
                .token(token)
                .roles(roles)
                .build();
    }
}
