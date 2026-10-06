package com.setec.stock_inventory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.setec.stock_inventory.dto.Request.LoginRequest;
import com.setec.stock_inventory.dto.Request.StockAdjustmentRequestDto;
import com.setec.stock_inventory.dto.Response.LoginResponse;
import com.setec.stock_inventory.entity.Category;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.entity.StockMovement;
import com.setec.stock_inventory.enums.MovementType;
import com.setec.stock_inventory.repo.CategoryRepository;
import com.setec.stock_inventory.repo.ProductRepository;
import com.setec.stock_inventory.repo.StockMovementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
public class InventoryHardeningIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    private String adminToken;
    private String stockToken;
    private Category testCategory;

    private String obtainToken(String username, String password) throws Exception {
        LoginRequest loginRequest = new LoginRequest(username, password);
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andReturn();

        assertEquals(200, result.getResponse().getStatus(), "Login failed: " + result.getResponse().getContentAsString());
        LoginResponse loginResponse = objectMapper.readValue(result.getResponse().getContentAsString(), LoginResponse.class);
        return "Bearer " + loginResponse.getToken();
    }

    @BeforeEach
    void setUp() throws Exception {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        adminToken = obtainToken("admin", "admin123");
        stockToken = obtainToken("stock", "stock123");

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        testCategory = categoryRepository.save(Category.builder()
                .name("CatHardening_" + suffix)
                .description("Test Category for Hardening")
                .build());
    }

    @Test
    void testProductDefaultFieldsOnBuildAndPersist() {
        Product p = Product.builder()
                .name("DefaultFields_" + UUID.randomUUID().toString().substring(0, 8))
                .price(49.99)
                .stock(10)
                .category(testCategory)
                .build();

        Product saved = productRepository.save(p);

        assertTrue(saved.isActive(), "Product should default active to true");
        assertEquals(0, saved.getReorderLevel(), "Product should default reorderLevel to 0");
        assertNull(saved.getCostPrice(), "Product costPrice should be nullable and null when not specified");
    }

    @Test
    void testSoftDeleteExcludesFromListingsAndRetainsInDatabase() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Product product = productRepository.save(Product.builder()
                .name("SoftDeleteProd_" + suffix)
                .price(100.0)
                .stock(20)
                .category(testCategory)
                .build());

        Long productId = product.getId();

        // 1. Soft-delete via API
        mockMvc.perform(delete("/api/products/" + productId)
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());

        // 2. Verify still in database but active = false
        Product inDb = productRepository.findById(productId).orElseThrow();
        assertFalse(inDb.isActive(), "Product should be soft-deleted (active = false)");

        // 3. Verify excluded from GET /api/products
        MvcResult allResult = mockMvc.perform(get("/api/products")
                        .header("Authorization", stockToken))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode allNode = objectMapper.readTree(allResult.getResponse().getContentAsString());
        JsonNode dataArray = allNode.get("data");
        boolean foundInAll = false;
        for (JsonNode item : dataArray) {
            if (item.get("id").asLong() == productId) {
                foundInAll = true;
                break;
            }
        }
        assertFalse(foundInAll, "Soft-deleted product must be excluded from GET /api/products");

        // 4. Verify excluded from GET /api/products/category/{categoryId}
        MvcResult catResult = mockMvc.perform(get("/api/products/category/" + testCategory.getId())
                        .header("Authorization", stockToken))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode catNode = objectMapper.readTree(catResult.getResponse().getContentAsString());
        boolean foundInCat = false;
        for (JsonNode item : catNode.get("data")) {
            if (item.get("id").asLong() == productId) {
                foundInCat = true;
                break;
            }
        }
        assertFalse(foundInCat, "Soft-deleted product must be excluded from category listing");

        // 5. Verify GET by ID still works
        MvcResult singleResult = mockMvc.perform(get("/api/products/" + productId)
                        .header("Authorization", stockToken))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode singleNode = objectMapper.readTree(singleResult.getResponse().getContentAsString());
        assertEquals(productId, singleNode.get("data").get("id").asLong());
        assertFalse(singleNode.get("data").get("active").asBoolean());
    }

    @Test
    void testLowStockDetection() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        // Product 1: Low stock (stock 3 <= reorderLevel 10)
        Product lowStockProd = productRepository.save(Product.builder()
                .name("LowStock_" + suffix)
                .price(10.0)
                .stock(3)
                .reorderLevel(10)
                .category(testCategory)
                .build());

        // Product 2: Normal stock (stock 25 > reorderLevel 10)
        Product normalStockProd = productRepository.save(Product.builder()
                .name("NormalStock_" + suffix)
                .price(10.0)
                .stock(25)
                .reorderLevel(10)
                .category(testCategory)
                .build());

        // Product 3: Low stock but inactive (must be excluded)
        Product inactiveLowStock = productRepository.save(Product.builder()
                .name("InactiveLowStock_" + suffix)
                .price(10.0)
                .stock(1)
                .reorderLevel(10)
                .active(false)
                .category(testCategory)
                .build());

        MvcResult result = mockMvc.perform(get("/api/products/low-stock")
                        .header("Authorization", stockToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode responseNode = objectMapper.readTree(result.getResponse().getContentAsString());
        JsonNode dataArray = responseNode.get("data");

        boolean containsLowStock = false;
        boolean containsNormal = false;
        boolean containsInactive = false;

        for (JsonNode node : dataArray) {
            long id = node.get("id").asLong();
            if (id == lowStockProd.getId()) containsLowStock = true;
            if (id == normalStockProd.getId()) containsNormal = true;
            if (id == inactiveLowStock.getId()) containsInactive = true;
        }

        assertTrue(containsLowStock, "Active product with stock <= reorderLevel must be in low-stock list");
        assertFalse(containsNormal, "Product with stock > reorderLevel must NOT be in low-stock list");
        assertFalse(containsInactive, "Inactive product must NOT be in low-stock list");
    }

    @Test
    void testManualStockAdjustmentPositiveAndNegative() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Product product = productRepository.save(Product.builder()
                .name("AdjustProd_" + suffix)
                .price(30.0)
                .stock(20)
                .category(testCategory)
                .build());

        Long productId = product.getId();

        // 1. Positive adjustment (+10)
        StockAdjustmentRequestDto increaseRequest = StockAdjustmentRequestDto.builder()
                .quantity(10)
                .reason("Warehouse restock intake")
                .build();

        mockMvc.perform(post("/api/products/" + productId + "/adjust-stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(increaseRequest))
                        .header("Authorization", stockToken))
                .andExpect(status().isOk());

        Product afterIncrease = productRepository.findById(productId).orElseThrow();
        assertEquals(30, afterIncrease.getStock());

        List<StockMovement> movements1 = stockMovementRepository.findByProductIdOrderByIdDesc(productId);
        assertFalse(movements1.isEmpty());
        StockMovement latest1 = movements1.get(0);
        assertEquals(MovementType.ADJUSTMENT, latest1.getType());
        assertEquals(10, latest1.getQuantity());
        assertEquals(20, latest1.getPreviousStock());
        assertEquals(30, latest1.getNewStock());
        assertEquals("Warehouse restock intake", latest1.getReason());
        assertNotNull(latest1.getUser());
        assertEquals("stock", latest1.getUser().getUsername());

        // 2. Negative adjustment (-5)
        StockAdjustmentRequestDto decreaseRequest = StockAdjustmentRequestDto.builder()
                .quantity(-5)
                .reason("Damaged in transit")
                .build();

        mockMvc.perform(post("/api/products/" + productId + "/adjust-stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(decreaseRequest))
                        .header("Authorization", stockToken))
                .andExpect(status().isOk());

        Product afterDecrease = productRepository.findById(productId).orElseThrow();
        assertEquals(25, afterDecrease.getStock());

        List<StockMovement> movements2 = stockMovementRepository.findByProductIdOrderByIdDesc(productId);
        StockMovement latest2 = movements2.get(0);
        assertEquals(MovementType.ADJUSTMENT, latest2.getType());
        assertEquals(5, latest2.getQuantity());
        assertEquals(30, latest2.getPreviousStock());
        assertEquals(25, latest2.getNewStock());
        assertEquals("Damaged in transit", latest2.getReason());
    }

    @Test
    void testManualStockAdjustmentRejections() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Product product = productRepository.save(Product.builder()
                .name("AdjustRejectProd_" + suffix)
                .price(15.0)
                .stock(5)
                .category(testCategory)
                .build());

        Long productId = product.getId();

        // 1. Resulting stock negative (-6 when stock is 5)
        StockAdjustmentRequestDto tooMuchDecrease = StockAdjustmentRequestDto.builder()
                .quantity(-6)
                .reason("Damaged")
                .build();

        mockMvc.perform(post("/api/products/" + productId + "/adjust-stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tooMuchDecrease))
                        .header("Authorization", stockToken))
                .andExpect(status().isBadRequest());

        // 2. Quantity zero
        StockAdjustmentRequestDto zeroQuantity = StockAdjustmentRequestDto.builder()
                .quantity(0)
                .reason("No change")
                .build();

        mockMvc.perform(post("/api/products/" + productId + "/adjust-stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(zeroQuantity))
                        .header("Authorization", stockToken))
                .andExpect(status().isBadRequest());

        // 3. Blank reason
        StockAdjustmentRequestDto blankReason = StockAdjustmentRequestDto.builder()
                .quantity(5)
                .reason("")
                .build();

        mockMvc.perform(post("/api/products/" + productId + "/adjust-stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(blankReason))
                        .header("Authorization", stockToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testDirectWarehouseStockIn() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Product product = productRepository.save(Product.builder()
                .name("StockInProd_" + suffix)
                .price(20.0)
                .stock(10)
                .category(testCategory)
                .build());

        Long productId = product.getId();

        StockAdjustmentRequestDto request = StockAdjustmentRequestDto.builder()
                .quantity(15)
                .reason("Found extra inventory on shelf B3")
                .build();

        mockMvc.perform(post("/api/products/" + productId + "/stock-in")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", stockToken))
                .andExpect(status().isOk());

        Product after = productRepository.findById(productId).orElseThrow();
        assertEquals(25, after.getStock());

        List<StockMovement> movements = stockMovementRepository.findByProductIdOrderByIdDesc(productId);
        assertFalse(movements.isEmpty());
        StockMovement latest = movements.get(0);
        assertEquals(MovementType.STOCK_IN, latest.getType());
        assertEquals(15, latest.getQuantity());
        assertEquals(10, latest.getPreviousStock());
        assertEquals(25, latest.getNewStock());
        assertEquals("Found extra inventory on shelf B3", latest.getReason());
        assertNotNull(latest.getUser());
        assertEquals("stock", latest.getUser().getUsername());

        // Rejection when quantity <= 0
        StockAdjustmentRequestDto badRequest = StockAdjustmentRequestDto.builder()
                .quantity(0)
                .reason("Zero stock in")
                .build();
        mockMvc.perform(post("/api/products/" + productId + "/stock-in")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badRequest))
                        .header("Authorization", stockToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testDirectWarehouseStockOut() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Product product = productRepository.save(Product.builder()
                .name("StockOutProd_" + suffix)
                .price(20.0)
                .stock(20)
                .category(testCategory)
                .build());

        Long productId = product.getId();

        StockAdjustmentRequestDto request = StockAdjustmentRequestDto.builder()
                .quantity(8)
                .reason("Damaged during forklift transport")
                .build();

        mockMvc.perform(post("/api/products/" + productId + "/stock-out")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", stockToken))
                .andExpect(status().isOk());

        Product after = productRepository.findById(productId).orElseThrow();
        assertEquals(12, after.getStock());

        List<StockMovement> movements = stockMovementRepository.findByProductIdOrderByIdDesc(productId);
        assertFalse(movements.isEmpty());
        StockMovement latest = movements.get(0);
        assertEquals(MovementType.STOCK_OUT, latest.getType());
        assertEquals(8, latest.getQuantity());
        assertEquals(20, latest.getPreviousStock());
        assertEquals(12, latest.getNewStock());
        assertEquals("Damaged during forklift transport", latest.getReason());
        assertNotNull(latest.getUser());
        assertEquals("stock", latest.getUser().getUsername());

        // Rejection when stock reduction exceeds available stock
        StockAdjustmentRequestDto tooMuch = StockAdjustmentRequestDto.builder()
                .quantity(50)
                .reason("Shrinkage")
                .build();
        mockMvc.perform(post("/api/products/" + productId + "/stock-out")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tooMuch))
                        .header("Authorization", stockToken))
                .andExpect(status().isBadRequest());

        // Rejection when quantity <= 0
        StockAdjustmentRequestDto badQuantity = StockAdjustmentRequestDto.builder()
                .quantity(-5)
                .reason("Negative number")
                .build();
        mockMvc.perform(post("/api/products/" + productId + "/stock-out")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badQuantity))
                        .header("Authorization", stockToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testAdjustStockWithTypeOverride() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Product product = productRepository.save(Product.builder()
                .name("TypeOverrideProd_" + suffix)
                .price(15.0)
                .stock(10)
                .category(testCategory)
                .build());

        Long productId = product.getId();

        // Stock in via adjust-stock with type = STOCK_IN
        StockAdjustmentRequestDto inReq = StockAdjustmentRequestDto.builder()
                .quantity(7)
                .reason("Returns not on PO")
                .type(MovementType.STOCK_IN)
                .build();

        mockMvc.perform(post("/api/products/" + productId + "/adjust-stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(inReq))
                        .header("Authorization", stockToken))
                .andExpect(status().isOk());

        List<StockMovement> movements = stockMovementRepository.findByProductIdOrderByIdDesc(productId);
        assertEquals(MovementType.STOCK_IN, movements.get(0).getType());
        assertEquals(17, productRepository.findById(productId).orElseThrow().getStock());

        // Stock out via adjust-stock with type = STOCK_OUT
        StockAdjustmentRequestDto outReq = StockAdjustmentRequestDto.builder()
                .quantity(4)
                .reason("Internal warehouse use")
                .type(MovementType.STOCK_OUT)
                .build();

        mockMvc.perform(post("/api/products/" + productId + "/adjust-stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(outReq))
                        .header("Authorization", stockToken))
                .andExpect(status().isOk());

        movements = stockMovementRepository.findByProductIdOrderByIdDesc(productId);
        assertEquals(MovementType.STOCK_OUT, movements.get(0).getType());
        assertEquals(13, productRepository.findById(productId).orElseThrow().getStock());
    }

    @Test
    void testMyTodayEndpointRemoved() throws Exception {
        mockMvc.perform(get("/api/orders/my-today")
                        .header("Authorization", stockToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void testCashierRoleRejectedInUserApi() throws Exception {
        String userJson = """
                {
                    "username": "cashier_attempt_%s",
                    "email": "cashier_attempt_%s@test.com",
                    "password": "password123",
                    "role": "CASHIER"
                }
                """.formatted(UUID.randomUUID().toString().substring(0, 8), UUID.randomUUID().toString().substring(0, 8));

        MvcResult result = mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(userJson)
                        .header("Authorization", adminToken))
                .andExpect(status().isBadRequest())
                .andReturn();

        assertTrue(result.getResponse().getContentAsString().contains("Must be ADMIN, STOCK, or USER"));
    }
}
