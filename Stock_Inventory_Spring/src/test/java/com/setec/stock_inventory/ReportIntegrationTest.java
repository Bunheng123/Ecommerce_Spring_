package com.setec.stock_inventory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.setec.stock_inventory.dto.Request.LoginRequest;
import com.setec.stock_inventory.dto.Response.LoginResponse;
import com.setec.stock_inventory.entity.*;
import com.setec.stock_inventory.enums.BuyerType;
import com.setec.stock_inventory.enums.PaymentMethod;
import com.setec.stock_inventory.enums.PaymentStatus;
import com.setec.stock_inventory.enums.Role;
import com.setec.stock_inventory.enums.WholesaleOrderStatus;
import com.setec.stock_inventory.repo.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
public class ReportIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private WholesaleOrderRepository wholesaleOrderRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WholesaleBuyerRepository wholesaleBuyerRepository;

    private String adminToken;
    private Category categoryA;
    private Category categoryB;
    private Brand brandAlpha;
    private User testUser;
    private WholesaleBuyer testBuyer;

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

        String suffix = UUID.randomUUID().toString().substring(0, 8);

        categoryA = categoryRepository.save(Category.builder()
                .name("CatA_" + suffix)
                .description("Category A")
                .build());

        categoryB = categoryRepository.save(Category.builder()
                .name("CatB_" + suffix)
                .description("Category B")
                .build());

        brandAlpha = brandRepository.save(Brand.builder()
                .name("BrandAlpha_" + suffix)
                .description("Brand Alpha")
                .build());

        testUser = userRepository.save(User.builder()
                .username("repuser_" + suffix)
                .email("repuser_" + suffix + "@test.com")
                .password("hashpass")
                .fullName("Report User")
                .role(Role.USER)
                .active(true)
                .build());

        testBuyer = wholesaleBuyerRepository.save(WholesaleBuyer.builder()
                .name("Buyer_" + suffix)
                .contactPerson("Mr. Buyer")
                .email("buyer_" + suffix + "@test.com")
                .phone("012345678")
                .address("Phnom Penh")
                .type(BuyerType.INDIVIDUAL)
                .active(true)
                .build());
    }

    @Test
    @DisplayName("Report Summary accurately computes revenue, COGS, and profit strictly from COMPLETED orders")
    void testCompletedOrdersOnlyCalculation() throws Exception {
        // Product 1: price = 100, costPrice = 60
        Product p1 = productRepository.save(Product.builder()
                .name("Prod1_" + UUID.randomUUID())
                .category(categoryA)
                .brand(brandAlpha)
                .price(100.0)
                .costPrice(60.0)
                .stock(100)
                .active(true)
                .build());

        // 1. Completed Retail Order: 2 units of p1 -> rev = 200, cogs = 120, profit = 80
        Order compOrder = Order.builder()
                .user(testUser)
                .orderDate(LocalDateTime.now())
                .status("COMPLETED")
                .paymentStatus(PaymentStatus.PAID)
                .paymentMethod(PaymentMethod.BANK_TRANSFER)
                .shippingAddress("Phnom Penh")
                .subtotal(new BigDecimal("200.00"))
                .taxAmount(new BigDecimal("20.00"))
                .shippingCost(BigDecimal.ZERO)
                .totalAmount(new BigDecimal("220.00"))
                .build();
        compOrder = orderRepository.save(compOrder);

        OrderItem item1 = new OrderItem();
        item1.setOrder(compOrder);
        item1.setProduct(p1);
        item1.setQuantity(2);
        item1.setPrice(100.0);
        compOrder.setOrderItems(new ArrayList<>(List.of(item1)));
        orderRepository.save(compOrder);

        // 2. Pending Retail Order: 5 units of p1 -> MUST BE EXCLUDED
        Order pendingOrder = Order.builder()
                .user(testUser)
                .orderDate(LocalDateTime.now())
                .status("PENDING")
                .paymentStatus(PaymentStatus.UNPAID)
                .subtotal(new BigDecimal("500.00"))
                .taxAmount(new BigDecimal("50.00"))
                .shippingCost(BigDecimal.ZERO)
                .totalAmount(new BigDecimal("550.00"))
                .build();
        pendingOrder = orderRepository.save(pendingOrder);

        OrderItem itemPending = new OrderItem();
        itemPending.setOrder(pendingOrder);
        itemPending.setProduct(p1);
        itemPending.setQuantity(5);
        itemPending.setPrice(100.0);
        pendingOrder.setOrderItems(new ArrayList<>(List.of(itemPending)));
        orderRepository.save(pendingOrder);

        // 3. Cancelled Retail Order: 3 units of p1 -> MUST BE EXCLUDED
        Order cancelledOrder = Order.builder()
                .user(testUser)
                .orderDate(LocalDateTime.now())
                .status("CANCELLED")
                .paymentStatus(PaymentStatus.REFUNDED)
                .subtotal(new BigDecimal("300.00"))
                .taxAmount(new BigDecimal("30.00"))
                .shippingCost(BigDecimal.ZERO)
                .totalAmount(new BigDecimal("330.00"))
                .build();
        cancelledOrder = orderRepository.save(cancelledOrder);

        OrderItem itemCancelled = new OrderItem();
        itemCancelled.setOrder(cancelledOrder);
        itemCancelled.setProduct(p1);
        itemCancelled.setQuantity(3);
        itemCancelled.setPrice(100.0);
        cancelledOrder.setOrderItems(new ArrayList<>(List.of(itemCancelled)));
        orderRepository.save(cancelledOrder);

        // 4. Completed Wholesale Order: 1 unit of p1 at wholesalePrice 80 -> rev = 80, cogs = 60, profit = 20
        WholesaleOrder compWholesale = WholesaleOrder.builder()
                .buyer(testBuyer)
                .createdBy(testUser)
                .status(WholesaleOrderStatus.COMPLETED)
                .orderDate(LocalDateTime.now())
                .totalAmount(80.0)
                .build();
        compWholesale = wholesaleOrderRepository.save(compWholesale);

        WholesaleOrderItem wItem = WholesaleOrderItem.builder()
                .wholesaleOrder(compWholesale)
                .product(p1)
                .quantity(1)
                .wholesalePrice(80.0)
                .build();
        compWholesale.setItems(new ArrayList<>(List.of(wItem)));
        wholesaleOrderRepository.save(compWholesale);

        // Call GET /api/reports/summary
        MvcResult res = mockMvc.perform(get("/api/reports/summary")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode data = objectMapper.readTree(res.getResponse().getContentAsString()).get("data");
        JsonNode kpis = data.get("kpis");

        // Total orders matching: 1 retail + 1 wholesale = 2 (pending & cancelled excluded)
        assertTrue(kpis.get("totalOrders").asInt() >= 2);
        assertTrue(kpis.get("retailOrdersCount").asInt() >= 1);
        assertTrue(kpis.get("wholesaleOrdersCount").asInt() >= 1);

        // Verify Best Sellers contains Prod1 with unitsSold = 3 (2 retail + 1 wholesale)
        JsonNode bestSellers = data.get("bestSellers");
        boolean foundP1 = false;
        for (JsonNode item : bestSellers) {
            if (item.get("productId").asLong() == p1.getId()) {
                foundP1 = true;
                assertEquals(3, item.get("unitsSold").asInt());
                assertEquals(280.0, item.get("revenue").asDouble(), 0.01); // 200 + 80 = 280
                assertEquals(180.0, item.get("cogs").asDouble(), 0.01);    // 3 * 60 = 180
                assertEquals(100.0, item.get("profit").asDouble(), 0.01);  // 280 - 180 = 100
                assertEquals(35.71, item.get("marginPercent").asDouble(), 0.05); // (100 / 280) * 100 = 35.71%
            }
        }
        assertTrue(foundP1, "Best sellers should contain Prod1");
    }

    @Test
    @DisplayName("Filtering by categoryId, brandId, and channel accurately isolates analytics")
    void testFilteringByCategoryBrandAndChannel() throws Exception {
        // Product in Category A, Brand Alpha: price = 50, cost = 30
        Product pA = productRepository.save(Product.builder()
                .name("ProductA_" + UUID.randomUUID())
                .category(categoryA)
                .brand(brandAlpha)
                .price(50.0)
                .costPrice(30.0)
                .stock(50)
                .active(true)
                .build());

        // Product in Category B, Unbranded (null brand): price = 70, cost = 40
        Product pB = productRepository.save(Product.builder()
                .name("ProductB_" + UUID.randomUUID())
                .category(categoryB)
                .brand(null)
                .price(70.0)
                .costPrice(40.0)
                .stock(50)
                .active(true)
                .build());

        // Order containing both pA and pB
        Order multiOrder = Order.builder()
                .user(testUser)
                .orderDate(LocalDateTime.now())
                .status("COMPLETED")
                .paymentStatus(PaymentStatus.PAID)
                .subtotal(new BigDecimal("120.00"))
                .taxAmount(new BigDecimal("12.00"))
                .shippingCost(BigDecimal.ZERO)
                .totalAmount(new BigDecimal("132.00"))
                .build();
        multiOrder = orderRepository.save(multiOrder);

        OrderItem oiA = new OrderItem();
        oiA.setOrder(multiOrder);
        oiA.setProduct(pA);
        oiA.setQuantity(2); // rev = 100, cogs = 60
        oiA.setPrice(50.0);

        OrderItem oiB = new OrderItem();
        oiB.setOrder(multiOrder);
        oiB.setProduct(pB);
        oiB.setQuantity(1); // rev = 70, cogs = 40
        oiB.setPrice(70.0);

        multiOrder.setOrderItems(new ArrayList<>(List.of(oiA, oiB)));
        orderRepository.save(multiOrder);

        // 1. Filter by Category A: only pA should be in bestSellers and KPIs
        MvcResult resCatA = mockMvc.perform(get("/api/reports/summary")
                        .param("categoryId", categoryA.getId().toString())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode dataCatA = objectMapper.readTree(resCatA.getResponse().getContentAsString()).get("data");
        JsonNode bestSellersCatA = dataCatA.get("bestSellers");
        for (JsonNode item : bestSellersCatA) {
            assertNotEquals(pB.getId(), item.get("productId").asLong(), "Product B must not be in Category A report");
        }

        // Verify breakdown filter independence: category breakdown should NOT be collapsed to just Category A
        JsonNode catBreakdown = dataCatA.get("revenueByCategory");
        boolean foundCatB = false;
        for (JsonNode c : catBreakdown) {
            if (c.get("id").asLong() == categoryB.getId()) {
                foundCatB = true;
                break;
            }
        }
        assertTrue(foundCatB, "revenueByCategory must retain other categories even when filtered by categoryId");

        // 2. Filter by Brand Alpha: only pA should be present in bestSellers
        MvcResult resBrand = mockMvc.perform(get("/api/reports/summary")
                        .param("brandId", brandAlpha.getId().toString())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode dataBrand = objectMapper.readTree(resBrand.getResponse().getContentAsString()).get("data");
        JsonNode bestSellersBrand = dataBrand.get("bestSellers");
        for (JsonNode item : bestSellersBrand) {
            assertNotEquals(pB.getId(), item.get("productId").asLong(), "Unbranded Product B must not be in Brand Alpha report");
        }

        // Verify breakdown filter independence: brand breakdown should retain other brands/unbranded
        JsonNode brandBreakdown = dataBrand.get("revenueByBrand");
        boolean foundUnbranded = false;
        for (JsonNode b : brandBreakdown) {
            if (b.get("id").asLong() == -1L || "Unbranded".equalsIgnoreCase(b.get("name").asText())) {
                foundUnbranded = true;
                break;
            }
        }
        assertTrue(foundUnbranded, "revenueByBrand must retain other brands even when filtered by brandId");

        // 3. Filter by unbrandedOnly: only pB should be present
        MvcResult resUnbranded = mockMvc.perform(get("/api/reports/summary")
                        .param("unbrandedOnly", "true")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode dataUnbranded = objectMapper.readTree(resUnbranded.getResponse().getContentAsString()).get("data");
        JsonNode bestSellersUnbranded = dataUnbranded.get("bestSellers");
        for (JsonNode item : bestSellersUnbranded) {
            assertNotEquals(pA.getId(), item.get("productId").asLong(), "Branded Product A must not be in Unbranded report");
        }
    }

    @Test
    @DisplayName("Historical COGS snapshot on OrderItem preserves historical profit even if product cost price changes")
    void testHistoricalCogsSnapshotIntegrity() throws Exception {
        Category snapCat = categoryRepository.save(Category.builder()
                .name("SnapCat_" + UUID.randomUUID())
                .description("Snap Category")
                .build());

        Product pSnap = productRepository.save(Product.builder()
                .name("ProdSnap_" + UUID.randomUUID())
                .category(snapCat)
                .brand(brandAlpha)
                .price(100.0)
                .costPrice(40.0)
                .stock(50)
                .active(true)
                .build());

        Order snapOrder = Order.builder()
                .user(testUser)
                .orderDate(LocalDateTime.now())
                .status("COMPLETED")
                .paymentStatus(PaymentStatus.PAID)
                .subtotal(new BigDecimal("200.00"))
                .taxAmount(new BigDecimal("20.00"))
                .shippingCost(BigDecimal.ZERO)
                .totalAmount(new BigDecimal("220.00"))
                .build();
        snapOrder = orderRepository.save(snapOrder);

        OrderItem snapItem = new OrderItem();
        snapItem.setOrder(snapOrder);
        snapItem.setProduct(pSnap);
        snapItem.setQuantity(2);
        snapItem.setPrice(100.0);
        snapItem.setUnitCost(new BigDecimal("40.00"));
        snapItem.setTotalCogs(new BigDecimal("80.00")); // 2 * 40.00 = 80.00

        snapOrder.setOrderItems(new ArrayList<>(List.of(snapItem)));
        orderRepository.save(snapOrder);

        // Now modify the product's cost price to 999.00 (simulating later supplier price hike)
        pSnap.setCostPrice(999.00);
        productRepository.save(pSnap);

        // Fetch report summary filtered to snapCat
        MvcResult res = mockMvc.perform(get("/api/reports/summary")
                        .param("categoryId", snapCat.getId().toString())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode data = objectMapper.readTree(res.getResponse().getContentAsString()).get("data");
        JsonNode kpis = data.get("kpis");

        // COGS must remain exactly 80.00 from the historical snapshot, NOT 2 * 999 = 1998
        assertEquals(80.00, kpis.get("totalCogs").asDouble(), 0.01);
        assertEquals(200.00, kpis.get("netProductRevenue").asDouble(), 0.01);
        assertEquals(120.00, kpis.get("grossProfit").asDouble(), 0.01); // 200 - 80 = 120

        // And verify requirement 2: tax & shipping are null when filtered by categoryId
        assertTrue(kpis.get("totalTaxCollected").isNull());
        assertTrue(kpis.get("totalShippingCollected").isNull());
        assertEquals(200.00, kpis.get("grossRevenue").asDouble(), 0.01); // grossRevenue equals netProductRevenue
    }

    @Test
    @DisplayName("Report summary correctly identifies sold items missing cost records")
    void testMissingCostTracking() throws Exception {
        Category missCat = categoryRepository.save(Category.builder()
                .name("MissCat_" + UUID.randomUUID())
                .description("Missing Cost Category")
                .build());

        Product pMiss = productRepository.save(Product.builder()
                .name("ProdMiss_" + UUID.randomUUID())
                .category(missCat)
                .price(50.0)
                .costPrice(0.0)
                .stock(50)
                .active(true)
                .build());

        Order missOrder = Order.builder()
                .user(testUser)
                .orderDate(LocalDateTime.now())
                .status("COMPLETED")
                .paymentStatus(PaymentStatus.PAID)
                .subtotal(new BigDecimal("50.00"))
                .taxAmount(BigDecimal.ZERO)
                .shippingCost(BigDecimal.ZERO)
                .totalAmount(new BigDecimal("50.00"))
                .build();
        missOrder = orderRepository.save(missOrder);

        OrderItem missItem = new OrderItem();
        missItem.setOrder(missOrder);
        missItem.setProduct(pMiss);
        missItem.setQuantity(1);
        missItem.setPrice(50.0);
        missItem.setUnitCost(BigDecimal.ZERO);
        missItem.setTotalCogs(BigDecimal.ZERO);

        missOrder.setOrderItems(new ArrayList<>(List.of(missItem)));
        orderRepository.save(missOrder);

        MvcResult res = mockMvc.perform(get("/api/reports/summary")
                        .param("categoryId", missCat.getId().toString())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode data = objectMapper.readTree(res.getResponse().getContentAsString()).get("data");
        JsonNode kpis = data.get("kpis");

        assertEquals(1, kpis.get("itemsMissingCost").asLong(), "Should identify 1 line item missing cost");
    }

    @Test
    @DisplayName("Non-admin users (such as USER or STOCK role) are forbidden from accessing /api/reports/**")
    void testReportsForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(get("/api/reports/summary")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("regularUser").roles("USER")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/reports/summary")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("stockStaff").roles("STOCK")))
                .andExpect(status().isForbidden());
    }
}
