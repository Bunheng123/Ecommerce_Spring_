package com.setec.stock_inventory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.setec.stock_inventory.dto.Request.LoginRequest;
import com.setec.stock_inventory.dto.Request.WholesaleBuyerRequestDto;
import com.setec.stock_inventory.dto.Request.WholesaleOrderItemRequestDto;
import com.setec.stock_inventory.dto.Request.WholesaleOrderRequestDto;
import com.setec.stock_inventory.dto.Response.LoginResponse;
import com.setec.stock_inventory.entity.Category;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.entity.StockMovement;
import com.setec.stock_inventory.enums.BuyerType;
import com.setec.stock_inventory.enums.MovementType;
import com.setec.stock_inventory.repo.CategoryRepository;
import com.setec.stock_inventory.repo.ProductRepository;
import com.setec.stock_inventory.repo.StockMovementRepository;
import com.setec.stock_inventory.repo.WholesaleBuyerRepository;
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
public class WholesaleIntegrationTest {

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

    @Autowired
    private WholesaleBuyerRepository wholesaleBuyerRepository;

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
                .name("WholesaleCat_" + suffix)
                .description("Wholesale Test Category")
                .build());
    }

    @Test
    void testWholesaleBuyerCreationBothTypes() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        // 1. Create ORGANIZATION buyer
        WholesaleBuyerRequestDto orgDto = WholesaleBuyerRequestDto.builder()
                .type(BuyerType.ORGANIZATION)
                .name("MegaCorp " + suffix)
                .contactPerson("Alice Smith")
                .phone("012345678")
                .email("alice@" + suffix + ".com")
                .address("Industrial Zone 4")
                .build();

        MvcResult orgResult = mockMvc.perform(post("/api/wholesale-buyers")
                        .header("Authorization", "Bearer " + stockToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orgDto)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode orgNode = objectMapper.readTree(orgResult.getResponse().getContentAsString()).get("data");
        Long orgId = orgNode.get("id").asLong();
        assertEquals("ORGANIZATION", orgNode.get("type").asText());
        assertEquals("MegaCorp " + suffix, orgNode.get("name").asText());
        assertEquals("Alice Smith", orgNode.get("contactPerson").asText());
        assertTrue(orgNode.get("active").asBoolean());

        // 2. Create INDIVIDUAL buyer
        WholesaleBuyerRequestDto indDto = WholesaleBuyerRequestDto.builder()
                .type(BuyerType.INDIVIDUAL)
                .name("Bob Builder " + suffix)
                .phone("098765432")
                .email("bob@" + suffix + ".com")
                .address("Residential St 10")
                .build();

        MvcResult indResult = mockMvc.perform(post("/api/wholesale-buyers")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(indDto)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode indNode = objectMapper.readTree(indResult.getResponse().getContentAsString()).get("data");
        Long indId = indNode.get("id").asLong();
        assertNotNull(indId);
        assertEquals("INDIVIDUAL", indNode.get("type").asText());
        assertEquals("Bob Builder " + suffix, indNode.get("name").asText());
        assertTrue(indNode.get("active").asBoolean());

        // 3. Retrieve all buyers
        mockMvc.perform(get("/api/wholesale-buyers")
                        .header("Authorization", "Bearer " + stockToken))
                .andExpect(status().isOk());

        // 4. Retrieve single buyer
        mockMvc.perform(get("/api/wholesale-buyers/" + orgId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    void testWholesaleOrderLifecycleCompleteAndDeductStock() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        // Buyer
        WholesaleBuyerRequestDto buyerDto = WholesaleBuyerRequestDto.builder()
                .type(BuyerType.ORGANIZATION)
                .name("Bulk Supermarket " + suffix)
                .contactPerson("Manager Dave")
                .build();
        MvcResult buyerRes = mockMvc.perform(post("/api/wholesale-buyers")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buyerDto)))
                .andExpect(status().isCreated())
                .andReturn();
        Long buyerId = objectMapper.readTree(buyerRes.getResponse().getContentAsString()).get("data").get("id").asLong();

        // Products with retail price 100.0 and stock 50
        Product p1 = productRepository.save(Product.builder()
                .name("Product_WS1_" + suffix)
                .price(100.0)
                .stock(50)
                .category(testCategory)
                .build());

        // Wholesale order with negotiated price: 75.0 (different from Product.price 100.0)
        WholesaleOrderItemRequestDto itemDto = WholesaleOrderItemRequestDto.builder()
                .productId(p1.getId())
                .quantity(10)
                .wholesalePrice(75.0)
                .build();

        WholesaleOrderRequestDto orderDto = WholesaleOrderRequestDto.builder()
                .buyerId(buyerId)
                .items(List.of(itemDto))
                .build();

        // 1. Create order
        MvcResult createRes = mockMvc.perform(post("/api/wholesale-orders")
                        .header("Authorization", "Bearer " + stockToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderDto)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode orderNode = objectMapper.readTree(createRes.getResponse().getContentAsString()).get("data");
        Long orderId = orderNode.get("id").asLong();
        assertEquals("PENDING", orderNode.get("status").asText());
        assertEquals(750.0, orderNode.get("totalAmount").asDouble(), 0.001);

        // Confirm stock is untouched upon creation (50)
        Product pAfterCreate = productRepository.findById(p1.getId()).orElseThrow();
        assertEquals(50, pAfterCreate.getStock());

        // 2. Complete order
        MvcResult completeRes = mockMvc.perform(put("/api/wholesale-orders/" + orderId + "/complete")
                        .header("Authorization", "Bearer " + stockToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode compNode = objectMapper.readTree(completeRes.getResponse().getContentAsString()).get("data");
        assertEquals("COMPLETED", compNode.get("status").asText());

        // Confirm stock decreased by 10 (50 -> 40)
        Product pAfterComplete = productRepository.findById(p1.getId()).orElseThrow();
        assertEquals(40, pAfterComplete.getStock());

        // Confirm StockMovement logged
        List<StockMovement> movements = stockMovementRepository.findByProductIdOrderByIdDesc(p1.getId());
        assertFalse(movements.isEmpty());
        StockMovement latest = movements.get(0);
        assertEquals(MovementType.STOCK_OUT, latest.getType());
        assertEquals(10, latest.getQuantity());
        assertEquals(50, latest.getPreviousStock());
        assertEquals(40, latest.getNewStock());
        assertEquals("Wholesale Order #" + orderId, latest.getReason());

        // 3. Try completing it again -> Rejected
        mockMvc.perform(put("/api/wholesale-orders/" + orderId + "/complete")
                        .header("Authorization", "Bearer " + stockToken))
                .andExpect(status().isBadRequest());

        // 4. Try cancelling a COMPLETED order -> Rejected
        mockMvc.perform(put("/api/wholesale-orders/" + orderId + "/cancel")
                        .header("Authorization", "Bearer " + stockToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testWholesaleOrderCancelWhilePendingLeavesStockUntouched() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        WholesaleBuyerRequestDto buyerDto = WholesaleBuyerRequestDto.builder()
                .type(BuyerType.INDIVIDUAL)
                .name("Individual Trader " + suffix)
                .build();
        MvcResult buyerRes = mockMvc.perform(post("/api/wholesale-buyers")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buyerDto)))
                .andExpect(status().isCreated())
                .andReturn();
        Long buyerId = objectMapper.readTree(buyerRes.getResponse().getContentAsString()).get("data").get("id").asLong();

        Product p = productRepository.save(Product.builder()
                .name("Product_CancelTest_" + suffix)
                .price(80.0)
                .stock(30)
                .category(testCategory)
                .build());

        WholesaleOrderRequestDto orderDto = WholesaleOrderRequestDto.builder()
                .buyerId(buyerId)
                .items(List.of(WholesaleOrderItemRequestDto.builder()
                        .productId(p.getId())
                        .quantity(5)
                        .wholesalePrice(60.0)
                        .build()))
                .build();

        // Create
        MvcResult createRes = mockMvc.perform(post("/api/wholesale-orders")
                        .header("Authorization", "Bearer " + stockToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderDto)))
                .andExpect(status().isCreated())
                .andReturn();
        Long orderId = objectMapper.readTree(createRes.getResponse().getContentAsString()).get("data").get("id").asLong();

        // Cancel while PENDING
        MvcResult cancelRes = mockMvc.perform(put("/api/wholesale-orders/" + orderId + "/cancel")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode cancelNode = objectMapper.readTree(cancelRes.getResponse().getContentAsString()).get("data");
        assertEquals("CANCELLED", cancelNode.get("status").asText());

        // Stock untouched (30)
        Product pAfterCancel = productRepository.findById(p.getId()).orElseThrow();
        assertEquals(30, pAfterCancel.getStock());

        // No movements created
        List<StockMovement> movements = stockMovementRepository.findByProductIdOrderByIdDesc(p.getId());
        assertTrue(movements.isEmpty());

        // Try completing a CANCELLED order -> Rejected
        mockMvc.perform(put("/api/wholesale-orders/" + orderId + "/complete")
                        .header("Authorization", "Bearer " + stockToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testWholesaleOrderInsufficientStockRejected() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        WholesaleBuyerRequestDto buyerDto = WholesaleBuyerRequestDto.builder()
                .type(BuyerType.ORGANIZATION)
                .name("Greedy Org " + suffix)
                .build();
        MvcResult buyerRes = mockMvc.perform(post("/api/wholesale-buyers")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buyerDto)))
                .andExpect(status().isCreated())
                .andReturn();
        Long buyerId = objectMapper.readTree(buyerRes.getResponse().getContentAsString()).get("data").get("id").asLong();

        Product p = productRepository.save(Product.builder()
                .name("LowStock_Prod_" + suffix)
                .price(50.0)
                .stock(5)
                .category(testCategory)
                .build());

        // Request 10 when stock is 5
        WholesaleOrderRequestDto orderDto = WholesaleOrderRequestDto.builder()
                .buyerId(buyerId)
                .items(List.of(WholesaleOrderItemRequestDto.builder()
                        .productId(p.getId())
                        .quantity(10)
                        .wholesalePrice(40.0)
                        .build()))
                .build();

        // Create must fail with 400 Bad Request
        mockMvc.perform(post("/api/wholesale-orders")
                        .header("Authorization", "Bearer " + stockToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderDto)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testSecurityUnauthenticatedRejected() throws Exception {
        mockMvc.perform(get("/api/wholesale-buyers"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/wholesale-orders"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testBuyerSoftDeleteWithExistingOrders() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        WholesaleBuyerRequestDto buyerDto = WholesaleBuyerRequestDto.builder()
                .type(BuyerType.INDIVIDUAL)
                .name("SoftDelete Candidate " + suffix)
                .build();
        MvcResult buyerRes = mockMvc.perform(post("/api/wholesale-buyers")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buyerDto)))
                .andExpect(status().isCreated())
                .andReturn();
        Long buyerId = objectMapper.readTree(buyerRes.getResponse().getContentAsString()).get("data").get("id").asLong();

        Product p = productRepository.save(Product.builder()
                .name("Product_SD_" + suffix)
                .price(20.0)
                .stock(20)
                .category(testCategory)
                .build());

        WholesaleOrderRequestDto orderDto = WholesaleOrderRequestDto.builder()
                .buyerId(buyerId)
                .items(List.of(WholesaleOrderItemRequestDto.builder()
                        .productId(p.getId())
                        .quantity(2)
                        .wholesalePrice(15.0)
                        .build()))
                .build();

        mockMvc.perform(post("/api/wholesale-orders")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderDto)))
                .andExpect(status().isCreated());

        // Delete buyer
        mockMvc.perform(delete("/api/wholesale-buyers/" + buyerId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Buyer still exists in DB but active is false
        var buyer = wholesaleBuyerRepository.findById(buyerId).orElseThrow();
        assertFalse(buyer.isActive());
    }
}
