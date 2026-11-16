package com.setec.stock_inventory.service.impl;

import com.setec.stock_inventory.dto.Request.LoginRequest;
import com.setec.stock_inventory.dto.Request.RegisterRequest;
import com.setec.stock_inventory.dto.Response.LoginResponse;
import com.setec.stock_inventory.dto.Response.LoginStatusResponse;
import com.setec.stock_inventory.dto.Response.MessageResponse;
import com.setec.stock_inventory.entity.User;
import com.setec.stock_inventory.enums.Role;
import com.setec.stock_inventory.exception.BadRequestException;
import com.setec.stock_inventory.exception.IpBlockedException;
import com.setec.stock_inventory.exception.LoginFailedException;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

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
    public LoginStatusResponse getLoginStatus(HttpServletRequest request) {
        HttpServletRequest currentReq = request != null ? request : httpServletRequest;
        String clientIp = rateLimiterService.extractClientIp(currentReq);

        // Rule 2: request limiter check (counts toward the 10/min limit)
        rateLimiterService.recordAndCheckRequestAllowed(clientIp);

        boolean blocked = rateLimiterService.isIpBlocked(clientIp);
        long retryAfterSeconds = rateLimiterService.getBlockRemainingSeconds(clientIp);
        int remainingAttempts = rateLimiterService.getRemainingAttempts(clientIp);

        return LoginStatusResponse.builder()
                .blocked(blocked)
                .retryAfterSeconds(retryAfterSeconds)
                .remainingAttempts(remainingAttempts)
                .build();
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        String clientIp = rateLimiterService.extractClientIp(httpServletRequest);

        // 1. Rule 2: Request limiter (10 requests per minute per IP)
        rateLimiterService.recordAndCheckRequestAllowed(clientIp);

        // 2. Rule 1: IP block check (5 failed attempts -> 1 minute block)
        if (rateLimiterService.isIpBlocked(clientIp)) {
            long retrySec = rateLimiterService.getBlockRemainingSeconds(clientIp);
            int remaining = rateLimiterService.getRemainingAttempts(clientIp);
            throw new IpBlockedException(
                    "Too many failed login attempts from your network. Try again in " + retrySec + " seconds.",
                    retrySec,
                    remaining
            );
        }

        // 3. User active check
        String loginIdentifier = request.getUsername() != null ? request.getUsername().trim() : "";
        User user = userRepository.findByUsername(loginIdentifier)
                .or(() -> userRepository.findByEmail(loginIdentifier))
                .orElse(null);

        if (user != null && !user.isActive()) {
            throw new BadRequestException("Your account has been deactivated by an administrator.");
        }

        // 4. Authenticate credentials
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
        } catch (DisabledException e) {
            throw new BadRequestException("Your account has been deactivated by an administrator.");
        } catch (BadCredentialsException e) {
            // Record failed attempt for caller's IP
            rateLimiterService.recordFailedLogin(clientIp);

            if (rateLimiterService.isIpBlocked(clientIp)) {
                long retrySec = rateLimiterService.getBlockRemainingSeconds(clientIp);
                throw new IpBlockedException(
                        "Too many failed login attempts from your network. Try again in " + retrySec + " seconds.",
                        retrySec,
                        0
                );
            }

            int remaining = rateLimiterService.getRemainingAttempts(clientIp);
            throw new LoginFailedException(
                    "Invalid username or password. " + remaining + " attempt" + (remaining == 1 ? "" : "s") + " remaining before network block.",
                    remaining
            );
        }

        // 5. Successful login: reset failed-attempt counter for caller's IP
        rateLimiterService.recordSuccessfulLogin(clientIp);

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
