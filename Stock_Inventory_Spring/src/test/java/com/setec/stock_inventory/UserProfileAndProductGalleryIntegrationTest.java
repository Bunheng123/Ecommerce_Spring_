package com.setec.stock_inventory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.setec.stock_inventory.config.CloudinaryService;
import com.setec.stock_inventory.dto.Request.LoginRequest;
import com.setec.stock_inventory.dto.Request.RegisterRequest;
import com.setec.stock_inventory.dto.Request.UserProfileUpdateRequestDto;
import com.setec.stock_inventory.dto.Request.UserRequestDto;
import com.setec.stock_inventory.dto.Response.LoginResponse;
import com.setec.stock_inventory.entity.Category;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.entity.User;
import com.setec.stock_inventory.enums.Role;
import com.setec.stock_inventory.repo.CategoryRepository;
import com.setec.stock_inventory.repo.ProductRepository;
import com.setec.stock_inventory.repo.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
public class UserProfileAndProductGalleryIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private CloudinaryService cloudinaryService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private String adminToken;
    private String stockToken;
    private Category testCategory;

    private String obtainToken(String username, String password) throws Exception {
        LoginRequest loginRequest = new LoginRequest(username, password);
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();
        String json = result.getResponse().getContentAsString();
        LoginResponse response = objectMapper.readValue(json, LoginResponse.class);
        return response.getToken();
    }

    @BeforeEach
    void setUp() throws Exception {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        adminToken = obtainToken("admin", "admin123");
        stockToken = obtainToken("stock", "stock123");

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        testCategory = categoryRepository.save(Category.builder()
                .name("GalleryCat_" + suffix)
                .description("Gallery Test Category")
                .build());
    }

    @Test
    void testPublicRegistrationAlwaysAssignsRoleUser() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        // 1. Submit with role="ADMIN" in body
        RegisterRequest req1 = RegisterRequest.builder()
                .username("reg_admin_attempt_" + suffix)
                .email("reg_admin_" + suffix + "@test.com")
                .password("password123")
                .role("ADMIN")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated());

        User u1 = userRepository.findByUsername("reg_admin_attempt_" + suffix).orElseThrow();
        assertEquals(Role.USER, u1.getRole(), "Public registration must assign USER even if ADMIN requested");

        // 2. Submit with role="STOCK" in body
        RegisterRequest req2 = RegisterRequest.builder()
                .username("reg_stock_attempt_" + suffix)
                .email("reg_stock_" + suffix + "@test.com")
                .password("password123")
                .role("STOCK")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isCreated());

        User u2 = userRepository.findByUsername("reg_stock_attempt_" + suffix).orElseThrow();
        assertEquals(Role.USER, u2.getRole(), "Public registration must assign USER even if STOCK requested");

        // 3. Submit with no role in body
        RegisterRequest req3 = RegisterRequest.builder()
                .username("reg_user_" + suffix)
                .email("reg_user_" + suffix + "@test.com")
                .password("password123")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req3)))
                .andExpect(status().isCreated());

        User u3 = userRepository.findByUsername("reg_user_" + suffix).orElseThrow();
        assertEquals(Role.USER, u3.getRole());
    }

    @Test
    void testUserProfileLifecycleAndPictureReplacement() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String username = "cust_profile_" + suffix;
        String email = "cust_" + suffix + "@test.com";

        // Register new USER
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(RegisterRequest.builder()
                                .username(username)
                                .email(email)
                                .password("password123")
                                .build())))
                .andExpect(status().isCreated());

        // Login as new USER
        String userToken = obtainToken(username, "password123");

        // 1. GET /api/users/me
        MvcResult meResult = mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode meNode = objectMapper.readTree(meResult.getResponse().getContentAsString()).get("data");
        assertEquals(username, meNode.get("username").asText());
        assertEquals(email, meNode.get("email").asText());
        assertEquals("USER", meNode.get("role").asText());

        // 2. PUT /api/users/me
        UserProfileUpdateRequestDto updateDto = UserProfileUpdateRequestDto.builder()
                .fullName("John Customer")
                .phone("012345678")
                .build();

        MvcResult updateResult = mockMvc.perform(put("/api/users/me")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode updatedNode = objectMapper.readTree(updateResult.getResponse().getContentAsString()).get("data");
        assertEquals("John Customer", updatedNode.get("fullName").asText());
        assertEquals("012345678", updatedNode.get("phone").asText());

        // 3. Upload first profile picture
        doReturn(Map.of("url", "https://cloudinary.com/profile1.jpg", "public_id", "pub_profile_1"))
                .when(cloudinaryService).uploadFile(any(MultipartFile.class), eq("stock_inventory/profile"));

        MockMultipartFile file1 = new MockMultipartFile(
                "file", "avatar1.png", "image/png", "avatar-bytes-1".getBytes()
        );

        MvcResult picResult1 = mockMvc.perform(multipart("/api/users/me/profile-picture")
                        .file(file1)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode picNode1 = objectMapper.readTree(picResult1.getResponse().getContentAsString()).get("data");
        assertEquals("https://cloudinary.com/profile1.jpg", picNode1.get("profileImageUrl").asText());
        assertEquals("pub_profile_1", picNode1.get("profilePublicId").asText());

        // Verify no asset deletion on first upload
        verify(cloudinaryService, never()).deleteFile(anyString());

        // 4. Replace profile picture -> Old asset ("pub_profile_1") must be deleted
        doReturn(Map.of("url", "https://cloudinary.com/profile2.jpg", "public_id", "pub_profile_2"))
                .when(cloudinaryService).uploadFile(any(MultipartFile.class), eq("stock_inventory/profile"));

        MockMultipartFile file2 = new MockMultipartFile(
                "file", "avatar2.png", "image/png", "avatar-bytes-2".getBytes()
        );

        MvcResult picResult2 = mockMvc.perform(multipart("/api/users/me/profile-picture")
                        .file(file2)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode picNode2 = objectMapper.readTree(picResult2.getResponse().getContentAsString()).get("data");
        assertEquals("https://cloudinary.com/profile2.jpg", picNode2.get("profileImageUrl").asText());
        assertEquals("pub_profile_2", picNode2.get("profilePublicId").asText());

        // Verify old asset was deleted!
        verify(cloudinaryService).deleteFile("pub_profile_1");
    }

    @Test
    void testUserRoleGets403OnAdminStockEndpoints() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String username = "cust_forbidden_" + suffix;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(RegisterRequest.builder()
                                .username(username)
                                .email("cust_f_" + suffix + "@test.com")
                                .password("password123")
                                .build())))
                .andExpect(status().isCreated());

        String userToken = obtainToken(username, "password123");

        // 1. Products write
        mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isForbidden());

        // 2. Adjust stock
        mockMvc.perform(post("/api/products/1/adjust-stock")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantity\": 1}"))
                .andExpect(status().isForbidden());

        // 3. Suppliers write
        mockMvc.perform(post("/api/suppliers")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"Bad Supplier\"}"))
                .andExpect(status().isForbidden());

        // 4. Purchase orders
        mockMvc.perform(post("/api/purchase-orders")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"supplierId\": 1, \"items\": []}"))
                .andExpect(status().isForbidden());

        // 5. Wholesale buyers
        mockMvc.perform(post("/api/wholesale-buyers")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\": \"INDIVIDUAL\", \"name\": \"Bad Buyer\"}"))
                .andExpect(status().isForbidden());

        // 6. Wholesale orders
        mockMvc.perform(post("/api/wholesale-orders")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"buyerId\": 1, \"items\": []}"))
                .andExpect(status().isForbidden());

        // 7. Users management (creating another user)
        mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\": \"newuser\", \"password\": \"pass\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void testProductGalleryUploadListAndDelete() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        Product product = productRepository.save(Product.builder()
                .name("GalleryProd_" + suffix)
                .price(99.0)
                .stock(20)
                .imageUrl("https://cloudinary.com/primary.jpg")
                .publicId("primary_pub_id")
                .category(testCategory)
                .build());

        // Setup Cloudinary mocks for gallery images
        doReturn(
                Map.of("url", "https://cloudinary.com/gallery1.jpg", "public_id", "gallery_pub_1"),
                Map.of("url", "https://cloudinary.com/gallery2.jpg", "public_id", "gallery_pub_2")
        ).when(cloudinaryService).uploadFile(any(MultipartFile.class), eq("stock_inventory/image"));

        MockMultipartFile file1 = new MockMultipartFile("file", "pic1.jpg", "image/jpeg", "bytes1".getBytes());
        MockMultipartFile file2 = new MockMultipartFile("file", "pic2.jpg", "image/jpeg", "bytes2".getBytes());

        // 1. Upload first image as STOCK
        MvcResult res1 = mockMvc.perform(multipart("/api/products/" + product.getId() + "/images")
                        .file(file1)
                        .header("Authorization", "Bearer " + stockToken))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode node1 = objectMapper.readTree(res1.getResponse().getContentAsString()).get("data");
        Long image1Id = node1.get("id").asLong();
        assertEquals("https://cloudinary.com/gallery1.jpg", node1.get("imageUrl").asText());

        // 2. Upload second image as ADMIN
        MvcResult res2 = mockMvc.perform(multipart("/api/products/" + product.getId() + "/images")
                        .file(file2)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode node2 = objectMapper.readTree(res2.getResponse().getContentAsString()).get("data");
        Long image2Id = node2.get("id").asLong();
        assertNotNull(image2Id);
        assertEquals("https://cloudinary.com/gallery2.jpg", node2.get("imageUrl").asText());

        // 3. GET /api/products/{id} and check galleryImageUrls has both images
        MvcResult getProductRes = mockMvc.perform(get("/api/products/" + product.getId())
                        .header("Authorization", "Bearer " + stockToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode productNode = objectMapper.readTree(getProductRes.getResponse().getContentAsString()).get("data");
        assertEquals("https://cloudinary.com/primary.jpg", productNode.get("imageUrl").asText(), "Primary image unchanged");
        JsonNode galleryArr = productNode.get("galleryImageUrls");
        assertNotNull(galleryArr);
        assertEquals(2, galleryArr.size());
        assertTrue(galleryArr.get(0).asText().contains("gallery1") || galleryArr.get(1).asText().contains("gallery1"));

        // 4. DELETE /api/products/{id}/images/{imageId1}
        mockMvc.perform(delete("/api/products/" + product.getId() + "/images/" + image1Id)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        verify(cloudinaryService).deleteFile("gallery_pub_1");

        // 5. Verify image1 removed, image2 remains
        MvcResult getAfterDelete = mockMvc.perform(get("/api/products/" + product.getId())
                        .header("Authorization", "Bearer " + stockToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode galleryAfter = objectMapper.readTree(getAfterDelete.getResponse().getContentAsString()).get("data").get("galleryImageUrls");
        assertEquals(1, galleryAfter.size());
        assertEquals("https://cloudinary.com/gallery2.jpg", galleryAfter.get(0).asText());

        // 6. Delete wrong product image / mismatch returns 404
        mockMvc.perform(delete("/api/products/" + product.getId() + "/images/999999")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void testAdminFullCrudOnCustomerUser() throws Exception {
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 6);

        // 1. CREATE USER (Role USER) by ADMIN
        UserRequestDto createRequest = new UserRequestDto();
        createRequest.setUsername("cust_" + uniqueSuffix);
        createRequest.setFullName("Customer Original");
        createRequest.setEmail("cust_" + uniqueSuffix + "@example.com");
        createRequest.setPassword("securePassword123");
        createRequest.setRole("USER");
        createRequest.setPhone("0987654321");

        MvcResult createResult = mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode createdUserNode = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("data");
        Long createdUserId = createdUserNode.get("id").asLong();
        assertEquals("cust_" + uniqueSuffix, createdUserNode.get("username").asText());
        assertEquals("USER", createdUserNode.get("role").asText());
        assertEquals("Customer Original", createdUserNode.get("fullName").asText());

        // 2. READ USER by ID
        MvcResult getResult = mockMvc.perform(get("/api/users/" + createdUserId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode fetchedUserNode = objectMapper.readTree(getResult.getResponse().getContentAsString()).get("data");
        assertEquals(createdUserId, fetchedUserNode.get("id").asLong());
        assertEquals("cust_" + uniqueSuffix + "@example.com", fetchedUserNode.get("email").asText());

        // 3. UPDATE USER by ADMIN
        UserRequestDto updateRequest = new UserRequestDto();
        updateRequest.setFullName("Customer Updated");
        updateRequest.setEmail("cust_upd_" + uniqueSuffix + "@example.com");
        updateRequest.setPhone("011223344");
        updateRequest.setRole("USER");

        MvcResult updateResult = mockMvc.perform(put("/api/users/" + createdUserId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode updatedUserNode = objectMapper.readTree(updateResult.getResponse().getContentAsString()).get("data");
        assertEquals("Customer Updated", updatedUserNode.get("fullName").asText());
        assertEquals("cust_upd_" + uniqueSuffix + "@example.com", updatedUserNode.get("email").asText());
        assertEquals("011223344", updatedUserNode.get("phone").asText());

        // 4. DELETE USER by ADMIN
        mockMvc.perform(delete("/api/users/" + createdUserId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // 5. VERIFY DELETED (Returns 404)
        mockMvc.perform(get("/api/users/" + createdUserId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }
}
