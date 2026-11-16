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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
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

    private String adminToken;
    private User testUser;
    private final String rawPassword = "correctPassword123";

    @BeforeEach
    void setUp() throws Exception {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        // Seed a distinct test user
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        testUser = userRepository.save(User.builder()
                .username("test_lockout_" + suffix)
                .email("lockout_" + suffix + "@test.com")
                .password(passwordEncoder.encode(rawPassword))
                .role(Role.USER)
                .active(true)
                .failedAttempts(0)
                .build());

        // Obtain admin token
        LoginRequest adminLogin = new LoginRequest("admin", "admin123");
        MvcResult adminRes = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminLogin)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode jsonNode = objectMapper.readTree(adminRes.getResponse().getContentAsString());
        adminToken = jsonNode.get("token").asText();
    }

    @Test
    void testWrongPasswordIncrementsFailedAttemptsAndShowsRemaining() throws Exception {
        LoginRequest badLogin = new LoginRequest(testUser.getUsername(), "wrongPass");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badLogin)))
                .andExpect(status().isBadRequest())
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        assertTrue(responseBody.contains("4 attempts remaining"), "Expected 4 attempts remaining in response: " + responseBody);

        User updated = userRepository.findById(testUser.getId()).orElseThrow();
        assertEquals(1, updated.getFailedAttempts());
        assertNull(updated.getLockoutUntil());
    }

    @Test
    void testFiveFailedAttemptsLocksAccount() throws Exception {
        LoginRequest badLogin = new LoginRequest(testUser.getUsername(), "wrongPass");

        for (int i = 1; i <= 4; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badLogin)))
                    .andExpect(status().isBadRequest());
        }

        // 5th attempt triggers lockout
        MvcResult res5 = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badLogin)))
                .andExpect(status().isBadRequest())
                .andReturn();

        String body5 = res5.getResponse().getContentAsString();
        assertTrue(body5.contains("Account has been locked for 15 minutes"), "Expected lockout notification in: " + body5);

        User lockedUser = userRepository.findById(testUser.getId()).orElseThrow();
        assertEquals(5, lockedUser.getFailedAttempts());
        assertNotNull(lockedUser.getLockoutUntil());
        assertTrue(lockedUser.isAccountLocked());
    }

    @Test
    void testLockedAccountRejectsEvenCorrectPassword() throws Exception {
        // Manually lock user
        testUser.setFailedAttempts(5);
        testUser.setLockoutUntil(LocalDateTime.now().plusMinutes(15));
        userRepository.save(testUser);

        LoginRequest validLogin = new LoginRequest(testUser.getUsername(), rawPassword);

        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validLogin)))
                .andExpect(status().isBadRequest())
                .andReturn();

        String body = res.getResponse().getContentAsString();
        assertTrue(body.contains("temporarily locked"), "Expected lockout message even with correct password: " + body);
    }

    @Test
    void testSuccessfulLoginResetsFailedAttempts() throws Exception {
        // User has 3 previous failed attempts
        testUser.setFailedAttempts(3);
        userRepository.save(testUser);

        LoginRequest validLogin = new LoginRequest(testUser.getUsername(), rawPassword);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validLogin)))
                .andExpect(status().isOk());

        User freshUser = userRepository.findById(testUser.getId()).orElseThrow();
        assertEquals(0, freshUser.getFailedAttempts(), "Successful login must reset failed attempts to 0");
        assertNull(freshUser.getLockoutUntil());
    }

    @Test
    void testIpRateLimiterBlocksExcessiveAttempts() throws Exception {
        String testIp = "203.0.113.42";
        rateLimiterService.reset(testIp);

        LoginRequest badLogin = new LoginRequest("non_existent_user", "badpass");

        // Execute MAX_ATTEMPTS (10) failed attempts from this IP
        for (int i = 0; i < LoginRateLimiterService.MAX_ATTEMPTS; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .header("X-Forwarded-For", testIp)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badLogin)))
                    .andExpect(status().isBadRequest());
        }

        // 11th attempt must be rejected with 429 Too Many Requests
        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", testIp)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badLogin)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));

        rateLimiterService.reset(testIp);
    }

    @Test
    void testAdminToggleStatusUnlocksUser() throws Exception {
        // Lock user
        testUser.setFailedAttempts(5);
        testUser.setLockoutUntil(LocalDateTime.now().plusMinutes(15));
        userRepository.save(testUser);

        // Admin toggles user status twice (inactive -> active)
        mockMvc.perform(patch("/api/users/" + testUser.getId() + "/toggle-status")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/users/" + testUser.getId() + "/toggle-status")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        User unlockedUser = userRepository.findById(testUser.getId()).orElseThrow();
        assertTrue(unlockedUser.isActive());
        assertEquals(0, unlockedUser.getFailedAttempts(), "Admin reactivation must reset failed attempts");
        assertNull(unlockedUser.getLockoutUntil(), "Admin reactivation must clear lockout timestamp");
    }
}
