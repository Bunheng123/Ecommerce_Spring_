package com.setec.stock_inventory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.setec.stock_inventory.config.CloudinaryService;
import com.setec.stock_inventory.dto.Request.LoginRequest;
import com.setec.stock_inventory.entity.User;
import com.setec.stock_inventory.enums.Role;
import com.setec.stock_inventory.repo.UserRepository;
import com.setec.stock_inventory.security.LoginRateLimiterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
@TestPropertySource(properties = {
        "auth.rate-limit.trust-forwarded-header=true",
        "auth.rate-limit.max-requests-per-minute=10",
        "auth.rate-limit.max-failed-attempts=5",
        "auth.rate-limit.block-duration-seconds=60"
})
public class AuthRateLimitAndLockoutIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private CloudinaryService cloudinaryService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private LoginRateLimiterService rateLimiterService;

    @Autowired
    private Clock clock;

    private User testUser;
    private final String rawPassword = "correctPassword123";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        rateLimiterService.reset();
        rateLimiterService.setClock(clock);
        rateLimiterService.setTrustForwardedHeader(true);

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        testUser = userRepository.save(User.builder()
                .username("test_ip_user_" + suffix)
                .email("ip_user_" + suffix + "@test.com")
                .password(passwordEncoder.encode(rawPassword))
                .role(Role.USER)
                .active(true)
                .build());
    }

    @Test
    void test1_fiveWrongPasswordsFromOneIpBlocksTheSixthAttemptEvenWithCorrectPassword() throws Exception {
        String testIp = "198.51.100.10";
        LoginRequest badLogin = new LoginRequest(testUser.getUsername(), "wrongPassword");

        // First 4 failed attempts return 400 Bad Request with remainingAttempts count
        for (int i = 1; i <= 4; i++) {
            MvcResult res = mockMvc.perform(post("/api/auth/login")
                            .header("X-Forwarded-For", testIp)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badLogin)))
                    .andExpect(status().isBadRequest())
                    .andReturn();

            JsonNode node = objectMapper.readTree(res.getResponse().getContentAsString());
            assertEquals(5 - i, node.get("remainingAttempts").asInt());
        }

        // 5th failed attempt blocks the IP -> returns 429 Too Many Requests
        MvcResult res5 = mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", testIp)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badLogin)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andReturn();

        JsonNode node5 = objectMapper.readTree(res5.getResponse().getContentAsString());
        assertTrue(node5.get("blocked").asBoolean());
        assertTrue(node5.get("retryAfterSeconds").asLong() > 0);

        // 6th attempt with CORRECT password from same IP is still blocked with 429
        LoginRequest correctLogin = new LoginRequest(testUser.getUsername(), rawPassword);
        MvcResult res6 = mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", testIp)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(correctLogin)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andReturn();

        JsonNode node6 = objectMapper.readTree(res6.getResponse().getContentAsString());
        assertTrue(node6.get("blocked").asBoolean());
    }

    @Test
    void test2_differentUserAgentOrSessionFromSameIpIsStillBlocked() throws Exception {
        String testIp = "198.51.100.11";
        LoginRequest badLogin = new LoginRequest(testUser.getUsername(), "wrongPassword");

        // 5 failed logins from browser A
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                    .header("X-Forwarded-For", testIp)
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Chrome/120)")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(badLogin)));
        }

        // Attempt from browser B (different User-Agent / incognito) on same IP is still blocked
        LoginRequest correctLogin = new LoginRequest(testUser.getUsername(), rawPassword);
        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", testIp)
                        .header("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0; Safari/604.1)")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(correctLogin)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
    }

    @Test
    void test3_differentIpIsNotBlocked() throws Exception {
        String blockedIp = "198.51.100.12";
        String cleanIp = "198.51.100.13";
        LoginRequest badLogin = new LoginRequest(testUser.getUsername(), "wrongPassword");

        // Block IP 1
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                    .header("X-Forwarded-For", blockedIp)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(badLogin)));
        }

        // Clean IP can log in successfully with correct password
        LoginRequest correctLogin = new LoginRequest(testUser.getUsername(), rawPassword);
        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", cleanIp)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(correctLogin)))
                .andExpect(status().isOk());
    }

    @Test
    void test4_blockExpiresAfterOneMinute() throws Exception {
        String testIp = "198.51.100.14";
        Instant t0 = Instant.parse("2026-11-16T10:00:00Z");
        rateLimiterService.setClock(Clock.fixed(t0, ZoneId.of("UTC")));

        LoginRequest badLogin = new LoginRequest(testUser.getUsername(), "wrongPassword");
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                    .header("X-Forwarded-For", testIp)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(badLogin)));
        }

        // Verify blocked at t0
        LoginRequest correctLogin = new LoginRequest(testUser.getUsername(), rawPassword);
        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", testIp)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(correctLogin)))
                .andExpect(status().isTooManyRequests());

        // Advance clock by 61 seconds (block duration is 60s)
        rateLimiterService.setClock(Clock.fixed(t0.plusSeconds(61), ZoneId.of("UTC")));

        // Now login succeeds!
        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", testIp)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(correctLogin)))
                .andExpect(status().isOk());
    }

    @Test
    void test5_eleventhRequestWithinOneMinuteReturns419() throws Exception {
        String testIp = "198.51.100.15";

        // Perform 10 requests to login-status within 1 minute
        for (int i = 1; i <= 10; i++) {
            mockMvc.perform(get("/api/auth/login-status")
                            .header("X-Forwarded-For", testIp))
                    .andExpect(status().isOk());
        }

        // 11th request within the minute returns HTTP 419
        MvcResult res11 = mockMvc.perform(get("/api/auth/login-status")
                        .header("X-Forwarded-For", testIp))
                .andExpect(status().is(419))
                .andExpect(header().exists("Retry-After"))
                .andReturn();

        JsonNode body = objectMapper.readTree(res11.getResponse().getContentAsString());
        assertFalse(body.get("success").asBoolean());
        assertTrue(body.get("retryAfterSeconds").asLong() > 0);
    }

    @Test
    void test6_successfulLoginResetsFailureCounter() throws Exception {
        String testIp = "198.51.100.16";
        LoginRequest badLogin = new LoginRequest(testUser.getUsername(), "wrongPassword");

        // 3 failed logins
        for (int i = 1; i <= 3; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .header("X-Forwarded-For", testIp)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badLogin)))
                    .andExpect(status().isBadRequest());
        }

        assertEquals(2, rateLimiterService.getRemainingAttempts(testIp));

        // Successful login
        LoginRequest correctLogin = new LoginRequest(testUser.getUsername(), rawPassword);
        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", testIp)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(correctLogin)))
                .andExpect(status().isOk());

        // Counter is reset to 5 remaining attempts
        assertEquals(5, rateLimiterService.getRemainingAttempts(testIp));
    }

    @Test
    void test7_loginStatusReturnsBlockedTrueWithRetryAfterSecondsWhileBlocked() throws Exception {
        String testIp = "198.51.100.17";
        LoginRequest badLogin = new LoginRequest(testUser.getUsername(), "wrongPassword");

        // 5 failed logins
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                    .header("X-Forwarded-For", testIp)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(badLogin)));
        }

        // Check login-status
        MvcResult statusRes = mockMvc.perform(get("/api/auth/login-status")
                        .header("X-Forwarded-For", testIp))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode statusJson = objectMapper.readTree(statusRes.getResponse().getContentAsString());
        assertTrue(statusJson.get("blocked").asBoolean(), "Expected blocked=true");
        assertTrue(statusJson.get("retryAfterSeconds").asLong() > 0, "Expected retryAfterSeconds > 0");
        assertEquals(0, statusJson.get("remainingAttempts").asInt(), "Expected remainingAttempts = 0");
    }
}
