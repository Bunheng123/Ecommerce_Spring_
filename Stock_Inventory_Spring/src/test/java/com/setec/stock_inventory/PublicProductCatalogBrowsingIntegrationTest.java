package com.setec.stock_inventory;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.setec.stock_inventory.config.CloudinaryService;
import com.setec.stock_inventory.dto.Request.CategoryRequestDto;
import com.setec.stock_inventory.dto.Request.LoginRequest;
import com.setec.stock_inventory.dto.Request.RegisterRequest;
import com.setec.stock_inventory.dto.Response.LoginResponse;
import com.setec.stock_inventory.entity.Category;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.repo.CategoryRepository;
import com.setec.stock_inventory.repo.ProductRepository;
import com.setec.stock_inventory.repo.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
public class PublicProductCatalogBrowsingIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private CloudinaryService cloudinaryService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private String adminToken;
    private String stockToken;
    private String userToken;
    private Category testCategory;
    private Product testProduct;

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

    private String registerAndObtainUserToken(String username, String email, String password) throws Exception {
        RegisterRequest registerRequest = RegisterRequest.builder()
                .username(username)
                .email(email)
                .password(password)
                .build();
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());
        return obtainToken(username, password);
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
        userToken = registerAndObtainUserToken("browseuser_" + suffix, "browseuser_" + suffix + "@test.com", "pass123");

        testCategory = categoryRepository.save(Category.builder()
                .name("PublicCat_" + suffix)
                .description("Public Browsing Category")
                .build());

        testProduct = productRepository.save(Product.builder()
                .name("PublicProduct_" + suffix)
                .price(29.99)
                .stock(25)
                .category(testCategory)
                .active(true)
                .build());
    }

    @Test
    void testAnonymousVisitorCanBrowseCatalogWithoutLogin() throws Exception {
        // 1. GET /api/products (all products)
        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk());

        // 2. GET /api/products/{id} (single product)
        mockMvc.perform(get("/api/products/" + testProduct.getId()))
                .andExpect(status().isOk());

        // 3. GET /api/products/category/{categoryId} (products by category)
        mockMvc.perform(get("/api/products/category/" + testCategory.getId()))
                .andExpect(status().isOk());

        // 4. GET /api/products/{id}/images (product gallery images)
        mockMvc.perform(get("/api/products/" + testProduct.getId() + "/images"))
                .andExpect(status().isOk());

        // 5. GET /api/categories (all categories)
        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk());

        // 6. GET /api/categories/{id} (single category)
        mockMvc.perform(get("/api/categories/" + testCategory.getId()))
                .andExpect(status().isOk());
    }

    @Test
    void testAnonymousVisitorCannotPerformWriteOperationsOnCatalog() throws Exception {
        // 1. POST /api/products (unauthenticated) -> 401
        MockMultipartFile file = new MockMultipartFile("image", "test.jpg", "image/jpeg", "content".getBytes());
        mockMvc.perform(multipart("/api/products")
                        .file(file)
                        .param("name", "Anon Product")
                        .param("price", "19.99")
                        .param("stock", "5")
                        .param("categoryId", testCategory.getId().toString()))
                .andExpect(status().isUnauthorized());

        // 2. PUT /api/products/{id} (unauthenticated) -> 401
        mockMvc.perform(multipart("/api/products/" + testProduct.getId())
                        .file(file)
                        .param("name", "Updated Anon Product")
                        .param("price", "19.99")
                        .param("stock", "5")
                        .param("categoryId", testCategory.getId().toString())
                        .with(req -> {
                            req.setMethod("PUT");
                            return req;
                        }))
                .andExpect(status().isUnauthorized());

        // 3. DELETE /api/products/{id} (unauthenticated) -> 401
        mockMvc.perform(delete("/api/products/" + testProduct.getId()))
                .andExpect(status().isUnauthorized());

        // 4. POST /api/categories (unauthenticated) -> 401
        CategoryRequestDto catDto = new CategoryRequestDto();
        catDto.setName("Anon Cat");
        catDto.setDescription("Description");
        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(catDto)))
                .andExpect(status().isUnauthorized());

        // 5. PUT /api/categories/{id} (unauthenticated) -> 401
        mockMvc.perform(put("/api/categories/" + testCategory.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(catDto)))
                .andExpect(status().isUnauthorized());

        // 6. DELETE /api/categories/{id} (unauthenticated) -> 401
        mockMvc.perform(delete("/api/categories/" + testCategory.getId()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testAnonymousVisitorCannotAccessInventoryManagement() throws Exception {
        // 1. GET /api/products/low-stock (unauthenticated) -> 401
        mockMvc.perform(get("/api/products/low-stock"))
                .andExpect(status().isUnauthorized());

        // 2. POST /api/products/{id}/adjust-stock (unauthenticated) -> 401
        mockMvc.perform(post("/api/products/" + testProduct.getId() + "/adjust-stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantity\": 5, \"reason\": \"test\"}"))
                .andExpect(status().isUnauthorized());

        // 3. POST /api/products/{id}/stock-in (unauthenticated) -> 401
        mockMvc.perform(post("/api/products/" + testProduct.getId() + "/stock-in")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantity\": 5}"))
                .andExpect(status().isUnauthorized());

        // 4. POST /api/products/{id}/stock-out (unauthenticated) -> 401
        mockMvc.perform(post("/api/products/" + testProduct.getId() + "/stock-out")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantity\": 5}"))
                .andExpect(status().isUnauthorized());

        // 5. POST /api/products/{id}/images (unauthenticated) -> 401
        MockMultipartFile file = new MockMultipartFile("file", "image.jpg", "image/jpeg", "image".getBytes());
        mockMvc.perform(multipart("/api/products/" + testProduct.getId() + "/images")
                        .file(file))
                .andExpect(status().isUnauthorized());

        // 6. DELETE /api/products/{id}/images/{imageId} (unauthenticated) -> 401
        mockMvc.perform(delete("/api/products/" + testProduct.getId() + "/images/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testAnonymousVisitorCannotAccessCartOrCheckout() throws Exception {
        // GET /api/cart
        mockMvc.perform(get("/api/cart"))
                .andExpect(status().isUnauthorized());

        // POST /api/cart/items
        mockMvc.perform(post("/api/cart/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\": " + testProduct.getId() + ", \"quantity\": 1}"))
                .andExpect(status().isUnauthorized());

        // PUT /api/cart/items/{id}
        mockMvc.perform(put("/api/cart/items/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantity\": 2}"))
                .andExpect(status().isUnauthorized());

        // DELETE /api/cart/items/{id}
        mockMvc.perform(delete("/api/cart/items/1"))
                .andExpect(status().isUnauthorized());

        // DELETE /api/cart
        mockMvc.perform(delete("/api/cart"))
                .andExpect(status().isUnauthorized());

        // POST /api/cart/checkout
        mockMvc.perform(post("/api/cart/checkout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"shippingAddress\": \"Nowhere\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testAuthenticatedRolesCanBrowseCatalog() throws Exception {
        // USER can browse
        mockMvc.perform(get("/api/products").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/products/" + testProduct.getId()).header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/categories").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk());

        // STOCK can browse
        mockMvc.perform(get("/api/products").header("Authorization", "Bearer " + stockToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/categories").header("Authorization", "Bearer " + stockToken))
                .andExpect(status().isOk());

        // ADMIN can browse
        mockMvc.perform(get("/api/products").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/categories").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    void testUserRoleCannotPerformWriteOrInventoryOperations() throws Exception {
        // USER cannot access low-stock -> 403
        mockMvc.perform(get("/api/products/low-stock").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());

        // USER cannot adjust stock -> 403
        mockMvc.perform(post("/api/products/" + testProduct.getId() + "/adjust-stock")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantity\": 1}"))
                .andExpect(status().isForbidden());

        // USER cannot delete product -> 403
        mockMvc.perform(delete("/api/products/" + testProduct.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());

        // USER cannot create category -> 403
        CategoryRequestDto userCatDto = new CategoryRequestDto();
        userCatDto.setName("Cat");
        userCatDto.setDescription("Desc");
        mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userCatDto)))
                .andExpect(status().isForbidden());
    }

    @Test
    void testAdminAndStockWriteAccessRemainsIntact() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        // STOCK can view low stock
        mockMvc.perform(get("/api/products/low-stock").header("Authorization", "Bearer " + stockToken))
                .andExpect(status().isOk());

        // ADMIN can view low stock
        mockMvc.perform(get("/api/products/low-stock").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // STOCK can create a category
        CategoryRequestDto staffCatDto = new CategoryRequestDto();
        staffCatDto.setName("StaffCat_" + suffix);
        staffCatDto.setDescription("Created by staff");
        mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + stockToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(staffCatDto)))
                .andExpect(status().isCreated());

        // ADMIN can adjust stock
        mockMvc.perform(post("/api/products/" + testProduct.getId() + "/adjust-stock")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantity\": 5, \"reason\": \"Restock\"}"))
                .andExpect(status().isOk());
    }
}
