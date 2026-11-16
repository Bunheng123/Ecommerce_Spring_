package com.setec.stock_inventory.security;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class LoginRateLimiterService {

    public static final int MAX_ATTEMPTS = 10;
    public static final long WINDOW_MILLIS = 60_000L; // 1 minute window

    private final ConcurrentHashMap<String, List<Long>> attemptsByIp = new ConcurrentHashMap<>();

    /**
     * Checks whether the client IP has exceeded the allowed rate limit.
     */
    public boolean isBlocked(String ip) {
        if (ip == null || ip.isBlank()) {
            return false;
        }

        long now = System.currentTimeMillis();
        List<Long> timestamps = attemptsByIp.get(ip);
        if (timestamps == null) {
            return false;
        }

        synchronized (timestamps) {
            timestamps.removeIf(time -> now - time > WINDOW_MILLIS);
            return timestamps.size() >= MAX_ATTEMPTS;
        }
    }

    /**
     * Records a login attempt from a given client IP.
     */
    public void recordAttempt(String ip) {
        if (ip == null || ip.isBlank()) {
            return;
        }

        long now = System.currentTimeMillis();
        attemptsByIp.compute(ip, (key, list) -> {
            if (list == null) {
                list = new ArrayList<>();
            }
            synchronized (list) {
                list.removeIf(time -> now - time > WINDOW_MILLIS);
                list.add(now);
            }
            return list;
        });
    }

    /**
     * Calculates the remaining seconds until the client IP is unblocked.
     */
    public long getRemainingWaitSeconds(String ip) {
        if (ip == null || ip.isBlank()) {
            return 0;
        }

        List<Long> timestamps = attemptsByIp.get(ip);
        if (timestamps == null) {
            return 0;
        }

        long now = System.currentTimeMillis();
        synchronized (timestamps) {
            timestamps.removeIf(time -> now - time > WINDOW_MILLIS);
            if (timestamps.isEmpty()) {
                return 0;
            }
            long oldest = timestamps.get(0);
            long elapsed = now - oldest;
            return Math.max(1, (WINDOW_MILLIS - elapsed + 999) / 1000);
        }
    }

    /**
     * Clears attempts for an IP (e.g. after a valid administrator action or test).
     */
    public void reset(String ip) {
        if (ip != null) {
            attemptsByIp.remove(ip);
        }
    }

    /**
     * Helper to resolve the real client IP behind reverse proxies/CDNs.
     */
    public String extractClientIp(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }

        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            String[] ips = xForwardedFor.split(",");
            if (ips.length > 0 && !ips[0].trim().isBlank()) {
                return ips[0].trim();
            }
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }

        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }

    /**
     * Periodic cleanup of idle IP entries to avoid memory accumulation.
     */
    public void cleanup() {
        long now = System.currentTimeMillis();
        attemptsByIp.entrySet().removeIf(entry -> {
            List<Long> list = entry.getValue();
            synchronized (list) {
                list.removeIf(time -> now - time > WINDOW_MILLIS);
                return list.isEmpty();
            }
        });
    }
}
