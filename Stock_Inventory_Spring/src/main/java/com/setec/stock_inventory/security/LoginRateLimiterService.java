package com.setec.stock_inventory.security;

import com.setec.stock_inventory.exception.RateLimitExceededException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class LoginRateLimiterService {

    @Getter
    @Setter
    @Value("${auth.rate-limit.max-requests-per-minute:10}")
    private int maxRequestsPerMinute = 10;

    @Getter
    @Setter
    @Value("${auth.rate-limit.max-failed-attempts:5}")
    private int maxFailedAttempts = 5;

    @Getter
    @Setter
    @Value("${auth.rate-limit.block-duration-seconds:60}")
    private int blockDurationSeconds = 60;

    @Getter
    @Setter
    @Value("${auth.rate-limit.trust-forwarded-header:false}")
    private boolean trustForwardedHeader = false;

    @Getter
    @Setter
    private Clock clock;

    // Rule 2: Request timestamps per IP (sliding window of 60 seconds)
    private final ConcurrentHashMap<String, List<Long>> requestTimestampsByIp = new ConcurrentHashMap<>();

    // Rule 1: Failed login state per IP
    private final ConcurrentHashMap<String, IpFailedState> failedStateByIp = new ConcurrentHashMap<>();

    public static class IpFailedState {
        public int failedAttempts = 0;
        public long blockedUntilMillis = 0L;
        public long lastFailedAttemptMillis = 0L;
    }

    public LoginRateLimiterService() {
        this.clock = Clock.systemUTC();
    }

    @Autowired
    public LoginRateLimiterService(Clock clock) {
        this.clock = clock != null ? clock : Clock.systemUTC();
    }

    // --- IP Extraction ---

    /**
     * Resolves the client IP address.
     * Only trusts X-Forwarded-For if auth.rate-limit.trust-forwarded-header=true,
     * otherwise falls back to request.getRemoteAddr().
     * Handles IPv6 loopback (::1 or 0:0:0:0:0:0:0:1) as 127.0.0.1.
     */
    public String extractClientIp(HttpServletRequest request) {
        if (request == null) {
            return "127.0.0.1";
        }

        String clientIp = null;
        if (trustForwardedHeader) {
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isBlank()) {
                String[] parts = xForwardedFor.split(",");
                if (parts.length > 0) {
                    String first = parts[0].trim();
                    if (!first.isBlank()) {
                        clientIp = first;
                    }
                }
            }
        }

        if (clientIp == null || clientIp.isBlank()) {
            clientIp = request.getRemoteAddr();
        }

        if (clientIp == null || clientIp.isBlank()) {
            clientIp = "127.0.0.1";
        }

        if (clientIp.equals("::1") || clientIp.equals("0:0:0:0:0:0:0:1")) {
            clientIp = "127.0.0.1";
        }

        return clientIp;
    }

    // --- Rule 2: Request Limiter (10 requests per minute per IP) ---

    /**
     * Checks if the request is allowed under the Rule 2 sliding window.
     * Only records allowed requests into the window.
     * If rate limit is exceeded, throws RateLimitExceededException WITHOUT recording the request.
     */
    public void recordAndCheckRequestAllowed(String ip) {
        if (ip == null || ip.isBlank()) return;

        long now = clock.millis();
        long windowMillis = 60_000L;
        List<Long> timestamps = requestTimestampsByIp.computeIfAbsent(ip, k -> new ArrayList<>());

        synchronized (timestamps) {
            timestamps.removeIf(time -> now - time > windowMillis);

            if (timestamps.size() >= maxRequestsPerMinute) {
                long oldest = timestamps.get(0);
                long elapsed = now - oldest;
                long retryAfterSeconds = Math.max(1, (windowMillis - elapsed + 999) / 1000);
                // Do NOT record rejected request
                throw new RateLimitExceededException(
                        "Too many requests from your network. Please wait " + retryAfterSeconds + " seconds.",
                        retryAfterSeconds
                );
            }

            // Allowed: record timestamp
            timestamps.add(now);
        }
    }

    // --- Rule 1: IP Block on Failed Logins (5 failures -> 1 min block) ---

    /**
     * Checks whether the given IP is currently blocked from logging in.
     * If the block duration has elapsed, auto-resets the counter and clears the block.
     */
    public boolean isIpBlocked(String ip) {
        if (ip == null || ip.isBlank()) return false;
        IpFailedState state = failedStateByIp.get(ip);
        if (state == null) return false;

        synchronized (state) {
            long now = clock.millis();
            if (state.blockedUntilMillis > now) {
                return true;
            }
            if (state.blockedUntilMillis != 0 && now >= state.blockedUntilMillis) {
                // Block expired: reset failure counter to 0
                state.failedAttempts = 0;
                state.blockedUntilMillis = 0L;
                state.lastFailedAttemptMillis = 0L;
                return false;
            }

            // Check if non-blocked failed attempts expired after window
            long trackingWindowMillis = blockDurationSeconds * 1000L;
            if (state.failedAttempts > 0 && (now - state.lastFailedAttemptMillis > trackingWindowMillis)) {
                state.failedAttempts = 0;
                state.lastFailedAttemptMillis = 0L;
            }
            return false;
        }
    }

    /**
     * Returns remaining block duration in seconds for the given IP, or 0 if not blocked.
     */
    public long getBlockRemainingSeconds(String ip) {
        if (ip == null || ip.isBlank()) return 0;
        IpFailedState state = failedStateByIp.get(ip);
        if (state == null) return 0;

        synchronized (state) {
            long now = clock.millis();
            if (state.blockedUntilMillis > now) {
                return Math.max(1, (state.blockedUntilMillis - now + 999) / 1000);
            }
            return 0;
        }
    }

    /**
     * Returns remaining failed attempts allowed before blocking.
     */
    public int getRemainingAttempts(String ip) {
        if (ip == null || ip.isBlank()) return maxFailedAttempts;
        IpFailedState state = failedStateByIp.get(ip);
        if (state == null) return maxFailedAttempts;

        synchronized (state) {
            long now = clock.millis();
            if (state.blockedUntilMillis != 0 && now >= state.blockedUntilMillis) {
                state.failedAttempts = 0;
                state.blockedUntilMillis = 0L;
                state.lastFailedAttemptMillis = 0L;
            } else {
                long trackingWindowMillis = blockDurationSeconds * 1000L;
                if (state.failedAttempts > 0 && (now - state.lastFailedAttemptMillis > trackingWindowMillis)) {
                    state.failedAttempts = 0;
                    state.lastFailedAttemptMillis = 0L;
                }
            }
            return Math.max(0, maxFailedAttempts - state.failedAttempts);
        }
    }

    /**
     * Records a failed login attempt for the given IP.
     * Blocked requests must NOT extend the block time.
     */
    public void recordFailedLogin(String ip) {
        if (ip == null || ip.isBlank()) return;
        IpFailedState state = failedStateByIp.computeIfAbsent(ip, k -> new IpFailedState());

        synchronized (state) {
            long now = clock.millis();
            // Blocked requests must not extend the block time
            if (state.blockedUntilMillis > now) {
                return;
            }

            if (state.blockedUntilMillis != 0 && now >= state.blockedUntilMillis) {
                state.failedAttempts = 0;
                state.blockedUntilMillis = 0L;
            } else {
                long trackingWindowMillis = blockDurationSeconds * 1000L;
                if (state.failedAttempts > 0 && (now - state.lastFailedAttemptMillis > trackingWindowMillis)) {
                    state.failedAttempts = 0;
                }
            }

            state.failedAttempts++;
            state.lastFailedAttemptMillis = now;

            if (state.failedAttempts >= maxFailedAttempts) {
                state.blockedUntilMillis = now + (blockDurationSeconds * 1000L);
            }
        }
    }

    /**
     * Resets that IP's failed-attempt counter upon successful login.
     */
    public void recordSuccessfulLogin(String ip) {
        if (ip == null || ip.isBlank()) return;
        IpFailedState state = failedStateByIp.get(ip);
        if (state != null) {
            synchronized (state) {
                state.failedAttempts = 0;
                state.blockedUntilMillis = 0L;
                state.lastFailedAttemptMillis = 0L;
            }
        }
    }

    // --- Reset & Cleanup ---

    /**
     * Resets all tracking data for tests and administrative resets.
     */
    public void reset() {
        requestTimestampsByIp.clear();
        failedStateByIp.clear();
    }

    public void reset(String ip) {
        if (ip != null) {
            requestTimestampsByIp.remove(ip);
            failedStateByIp.remove(ip);
        }
    }

    /**
     * Scheduled cleanup of expired entries every minute.
     */
    @Scheduled(fixedRate = 60000)
    public void cleanup() {
        long now = clock.millis();
        long windowMillis = 60_000L;

        requestTimestampsByIp.entrySet().removeIf(entry -> {
            List<Long> list = entry.getValue();
            synchronized (list) {
                list.removeIf(time -> now - time > windowMillis);
                return list.isEmpty();
            }
        });

        long trackingWindowMillis = blockDurationSeconds * 1000L;
        failedStateByIp.entrySet().removeIf(entry -> {
            IpFailedState state = entry.getValue();
            synchronized (state) {
                boolean blockExpired = state.blockedUntilMillis <= now;
                boolean attemptsExpired = (now - state.lastFailedAttemptMillis) > trackingWindowMillis;
                return blockExpired && (state.failedAttempts == 0 || attemptsExpired);
            }
        });
    }
}
