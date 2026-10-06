package com.setec.stock_inventory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.setec.stock_inventory.config.CloudinaryService;
import com.setec.stock_inventory.dto.Request.CartItemRequestDto;
import com.setec.stock_inventory.dto.Request.CartItemUpdateRequestDto;
import com.setec.stock_inventory.dto.Request.CheckoutRequestDto;
import com.setec.stock_inventory.dto.Request.LoginRequest;
import com.setec.stock_inventory.dto.Request.OrderItemRequestDto;
import com.setec.stock_inventory.dto.Request.OrderRequestDto;
import com.setec.stock_inventory.dto.Request.OrderStatusRequestDto;
import com.setec.stock_inventory.dto.Request.PaymentStatusRequestDto;
import com.setec.stock_inventory.dto.Request.RegisterRequest;
import com.setec.stock_inventory.dto.Response.LoginResponse;
import com.setec.stock_inventory.entity.Category;
import com.setec.stock_inventory.entity.Order;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.entity.StockMovement;
import com.setec.stock_inventory.entity.User;
import com.setec.stock_inventory.enums.MovementType;
import com.setec.stock_inventory.enums.PaymentMethod;
import com.setec.stock_inventory.enums.PaymentStatus;
import com.setec.stock_inventory.repo.CategoryRepository;
import com.setec.stock_inventory.repo.OrderRepository;
import com.setec.stock_inventory.repo.ProductRepository;
import com.setec.stock_inventory.repo.StockMovementRepository;
import com.setec.stock_inventory.repo.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
public class CartAndCheckoutIntegrationTest {

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

    @Autowired
    private OrderRepository orderRepository;

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
        testCategory = categoryRepository.save(Category.builder()
                .name("CartTestCategory_" + suffix)
                .description("Cart Test Category")
                .build());
    }

    @Test
    void testCartLifecycleAndStockValidations() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String userToken = registerAndObtainUserToken("cartuser_" + suffix, "cartuser_" + suffix + "@test.com", "pass123");

        Product product = productRepository.save(Product.builder()
                .name("CartProduct_" + suffix)
                .price(25.0)
                .stock(10)
                .category(testCategory)
                .active(true)
                .build());

        // 1. Get empty cart on first access
        MvcResult getResult = mockMvc.perform(get("/api/cart")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode cartJson = objectMapper.readTree(getResult.getResponse().getContentAsString()).get("data");
        assertEquals(0, cartJson.get("items").size());
        assertEquals(0.0, cartJson.get("totalAmount").asDouble());

        // 2. Reject adding more than available stock
        CartItemRequestDto excessiveReq = CartItemRequestDto.builder()
                .productId(product.getId())
                .quantity(15)
                .build();
        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(excessiveReq)))
                .andExpect(status().isBadRequest());

        // 3. Add item successfully
        CartItemRequestDto validReq = CartItemRequestDto.builder()
                .productId(product.getId())
                .quantity(4)
                .build();
        MvcResult addResult = mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode addJson = objectMapper.readTree(addResult.getResponse().getContentAsString()).get("data");
        assertEquals(1, addJson.get("items").size());
        assertEquals(4, addJson.get("items").get(0).get("quantity").asInt());
        assertEquals(100.0, addJson.get("totalAmount").asDouble());
        Long itemId = addJson.get("items").get(0).get("id").asLong();

        // 4. Adding same product again increments quantity
        CartItemRequestDto incrementReq = CartItemRequestDto.builder()
                .productId(product.getId())
                .quantity(3)
                .build();
        MvcResult incResult = mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(incrementReq)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode incJson = objectMapper.readTree(incResult.getResponse().getContentAsString()).get("data");
        assertEquals(1, incJson.get("items").size());
        assertEquals(7, incJson.get("items").get(0).get("quantity").asInt());

        // 5. Incrementing past available stock rejected (7 + 4 = 11 > 10)
        CartItemRequestDto exceedIncReq = CartItemRequestDto.builder()
                .productId(product.getId())
                .quantity(4)
                .build();
        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exceedIncReq)))
                .andExpect(status().isBadRequest());

        // 6. Update item quantity
        CartItemUpdateRequestDto updateReq = CartItemUpdateRequestDto.builder()
                .quantity(5)
                .build();
        MvcResult updateResult = mockMvc.perform(put("/api/cart/items/" + itemId)
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode updateJson = objectMapper.readTree(updateResult.getResponse().getContentAsString()).get("data");
        assertEquals(5, updateJson.get("items").get(0).get("quantity").asInt());
        assertEquals(125.0, updateJson.get("totalAmount").asDouble());

        // 7. Update exceeding stock is rejected
        CartItemUpdateRequestDto exceedUpdateReq = CartItemUpdateRequestDto.builder()
                .quantity(20)
                .build();
        mockMvc.perform(put("/api/cart/items/" + itemId)
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exceedUpdateReq)))
                .andExpect(status().isBadRequest());

        // 8. Delete one item
        MvcResult deleteItemResult = mockMvc.perform(delete("/api/cart/items/" + itemId)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode deleteItemJson = objectMapper.readTree(deleteItemResult.getResponse().getContentAsString()).get("data");
        assertEquals(0, deleteItemJson.get("items").size());

        // 9. Clear cart
        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isOk());

        MvcResult clearResult = mockMvc.perform(delete("/api/cart")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode clearJson = objectMapper.readTree(clearResult.getResponse().getContentAsString()).get("data");
        assertEquals(0, clearJson.get("items").size());

        // 10. Access control: Cart endpoints accessible by USER only
        mockMvc.perform(get("/api/cart")
                        .header("Authorization", "Bearer " + stockToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/cart"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testCheckoutSuccessfulFlow() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String userToken = registerAndObtainUserToken("checkoutuser_" + suffix, "checkoutuser_" + suffix + "@test.com", "pass123");

        Product p1 = productRepository.save(Product.builder()
                .name("CheckP1_" + suffix)
                .price(15.0)
                .stock(20)
                .category(testCategory)
                .active(true)
                .build());

        Product p2 = productRepository.save(Product.builder()
                .name("CheckP2_" + suffix)
                .price(30.0)
                .stock(10)
                .category(testCategory)
                .active(true)
                .build());

        // Add items to cart
        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CartItemRequestDto.builder()
                                .productId(p1.getId())
                                .quantity(3)
                                .build())))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CartItemRequestDto.builder()
                                .productId(p2.getId())
                                .quantity(2)
                                .build())))
                .andExpect(status().isOk());

        // Checkout
        CheckoutRequestDto checkoutDto = CheckoutRequestDto.builder()
                .shippingAddress("123 Test Street, Phnom Penh")
                .paymentMethod(PaymentMethod.CASH_ON_DELIVERY)
                .customerNote("Please leave at front door")
                .build();

        MvcResult checkoutResult = mockMvc.perform(post("/api/cart/checkout")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(checkoutDto)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode orderJson = objectMapper.readTree(checkoutResult.getResponse().getContentAsString()).get("data");
        Long orderId = orderJson.get("id").asLong();
        assertEquals("PENDING", orderJson.get("status").asText());
        assertEquals("UNPAID", orderJson.get("paymentStatus").asText());
        assertEquals("CASH_ON_DELIVERY", orderJson.get("paymentMethod").asText());
        assertEquals("123 Test Street, Phnom Penh", orderJson.get("shippingAddress").asText());
        assertEquals("Please leave at front door", orderJson.get("customerNote").asText());
        // 3 * 15 + 2 * 30 = 45 + 60 = 105
        assertEquals(105.0, orderJson.get("totalAmount").asDouble());

        // Verify stock deducted
        Product p1After = productRepository.findById(p1.getId()).orElseThrow();
        Product p2After = productRepository.findById(p2.getId()).orElseThrow();
        assertEquals(17, p1After.getStock());
        assertEquals(8, p2After.getStock());

        // Verify stock movements logged with STOCK_OUT and reason "Order #<id>"
        List<StockMovement> p1Movements = stockMovementRepository.findByProductIdOrderByIdDesc(p1.getId());
        assertFalse(p1Movements.isEmpty());
        StockMovement p1Move = p1Movements.get(0);
        assertEquals(MovementType.STOCK_OUT, p1Move.getType());
        assertEquals(3, p1Move.getQuantity());
        assertEquals("Order #" + orderId, p1Move.getReason());

        // Verify cart is cleared after checkout
        MvcResult cartResult = mockMvc.perform(get("/api/cart")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode cartData = objectMapper.readTree(cartResult.getResponse().getContentAsString()).get("data");
        assertEquals(0, cartData.get("items").size());
    }

    @Test
    void testCheckoutRejections() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String userToken = registerAndObtainUserToken("checkoutrej_" + suffix, "checkoutrej_" + suffix + "@test.com", "pass123");

        CheckoutRequestDto checkoutDto = CheckoutRequestDto.builder()
                .shippingAddress("123 Test Road")
                .paymentMethod(PaymentMethod.CASH_ON_DELIVERY)
                .build();

        // 1. Empty cart rejection
        mockMvc.perform(post("/api/cart/checkout")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(checkoutDto)))
                .andExpect(status().isBadRequest());

        // 2. Insufficient stock at checkout time (e.g. stock was reduced after item was added)
        Product limitedProduct = productRepository.save(Product.builder()
                .name("LimitedProd_" + suffix)
                .price(50.0)
                .stock(5)
                .category(testCategory)
                .active(true)
                .build());

        // Add 5 to cart
        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CartItemRequestDto.builder()
                                .productId(limitedProduct.getId())
                                .quantity(5)
                                .build())))
                .andExpect(status().isOk());

        // Warehouse sells 3 units directly, leaving only 2 in stock
        limitedProduct.setStock(2);
        productRepository.save(limitedProduct);

        // Checkout should fail and mention product
        MvcResult failResult = mockMvc.perform(post("/api/cart/checkout")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(checkoutDto)))
                .andExpect(status().isBadRequest())
                .andReturn();

        String errorResponse = failResult.getResponse().getContentAsString();
        assertTrue(errorResponse.contains(limitedProduct.getName()));
    }

    @Test
    void testOrderVisibilityRules() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String user1Token = registerAndObtainUserToken("user1_" + suffix, "user1_" + suffix + "@test.com", "pass123");
        String user2Token = registerAndObtainUserToken("user2_" + suffix, "user2_" + suffix + "@test.com", "pass123");

        Product product = productRepository.save(Product.builder()
                .name("VisibilityProd_" + suffix)
                .price(20.0)
                .stock(50)
                .category(testCategory)
                .active(true)
                .build());

        // User 1 places an order via cart checkout
        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CartItemRequestDto.builder()
                                .productId(product.getId())
                                .quantity(2)
                                .build())))
                .andExpect(status().isOk());

        MvcResult checkoutRes = mockMvc.perform(post("/api/cart/checkout")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CheckoutRequestDto.builder()
                                .shippingAddress("User 1 Address")
                                .paymentMethod(PaymentMethod.BANK_TRANSFER)
                                .build())))
                .andExpect(status().isCreated())
                .andReturn();

        Long user1OrderId = objectMapper.readTree(checkoutRes.getResponse().getContentAsString()).get("data").get("id").asLong();

        // User 1 can view their own order
        mockMvc.perform(get("/api/orders/" + user1OrderId)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk());

        // User 1 can view their own order history via GET /api/orders/my
        MvcResult myOrdersRes = mockMvc.perform(get("/api/orders/my")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode myOrders = objectMapper.readTree(myOrdersRes.getResponse().getContentAsString()).get("data");
        assertEquals(1, myOrders.size());
        assertEquals(user1OrderId, myOrders.get(0).get("id").asLong());

        // User 2 CANNOT view User 1's order (403 Forbidden)
        mockMvc.perform(get("/api/orders/" + user1OrderId)
                        .header("Authorization", "Bearer " + user2Token))
                .andExpect(status().isForbidden());

        // User 1 CANNOT view the global all-orders list (403 Forbidden)
        mockMvc.perform(get("/api/orders")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isForbidden());

        // User 1 CANNOT view orders by userId (403 Forbidden)
        mockMvc.perform(get("/api/orders/user/1")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isForbidden());

        // User 1 CANNOT use staff PUT /api/orders/{id} (403 Forbidden)
        OrderStatusRequestDto statusReq = new OrderStatusRequestDto();
        statusReq.setStatus("COMPLETED");
        mockMvc.perform(put("/api/orders/" + user1OrderId)
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusReq)))
                .andExpect(status().isForbidden());

        // Admin & Stock CAN view any order
        mockMvc.perform(get("/api/orders/" + user1OrderId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/orders/" + user1OrderId)
                        .header("Authorization", "Bearer " + stockToken))
                .andExpect(status().isOk());
    }

    @Test
    void testSelfServiceCancellationWithinTwoHours() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String userToken = registerAndObtainUserToken("canceluser_" + suffix, "canceluser_" + suffix + "@test.com", "pass123");

        Product product = productRepository.save(Product.builder()
                .name("CancelProd_" + suffix)
                .price(40.0)
                .stock(15)
                .category(testCategory)
                .active(true)
                .build());

        // Add to cart and checkout
        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CartItemRequestDto.builder()
                                .productId(product.getId())
                                .quantity(5)
                                .build())))
                .andExpect(status().isOk());

        MvcResult checkoutRes = mockMvc.perform(post("/api/cart/checkout")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CheckoutRequestDto.builder()
                                .shippingAddress("Cancel Test Address")
                                .paymentMethod(PaymentMethod.CASH_ON_DELIVERY)
                                .build())))
                .andExpect(status().isCreated())
                .andReturn();

        Long orderId = objectMapper.readTree(checkoutRes.getResponse().getContentAsString()).get("data").get("id").asLong();
        assertEquals(10, productRepository.findById(product.getId()).orElseThrow().getStock());

        // USER self-cancels within 2 hours
        MvcResult cancelRes = mockMvc.perform(post("/api/orders/" + orderId + "/cancel")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode cancelJson = objectMapper.readTree(cancelRes.getResponse().getContentAsString()).get("data");
        assertEquals("CANCELLED", cancelJson.get("status").asText());
        assertEquals("UNPAID", cancelJson.get("paymentStatus").asText());

        // Stock restored from 10 back to 15
        Product restoredProd = productRepository.findById(product.getId()).orElseThrow();
        assertEquals(15, restoredProd.getStock());

        // Stock movement logged with STOCK_IN
        List<StockMovement> movements = stockMovementRepository.findByProductIdOrderByIdDesc(product.getId());
        StockMovement latestMove = movements.get(0);
        assertEquals(MovementType.STOCK_IN, latestMove.getType());
        assertEquals(5, latestMove.getQuantity());
        assertEquals("Cancelled Order #" + orderId, latestMove.getReason());

        // Attempting to cancel again fails
        mockMvc.perform(post("/api/orders/" + orderId + "/cancel")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testPaidOrderBecomesRefundedOnCancel() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String userToken = registerAndObtainUserToken("paidcancel_" + suffix, "paidcancel_" + suffix + "@test.com", "pass123");

        Product product = productRepository.save(Product.builder()
                .name("PaidCancelProd_" + suffix)
                .price(50.0)
                .stock(10)
                .category(testCategory)
                .active(true)
                .build());

        // Add to cart & checkout
        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CartItemRequestDto.builder()
                                .productId(product.getId())
                                .quantity(2)
                                .build())))
                .andExpect(status().isOk());

        MvcResult checkoutRes = mockMvc.perform(post("/api/cart/checkout")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CheckoutRequestDto.builder()
                                .shippingAddress("Paid Address")
                                .paymentMethod(PaymentMethod.QR_PAYMENT)
                                .build())))
                .andExpect(status().isCreated())
                .andReturn();

        Long orderId = objectMapper.readTree(checkoutRes.getResponse().getContentAsString()).get("data").get("id").asLong();

        // User cannot update payment status (403 Forbidden)
        PaymentStatusRequestDto payReq = PaymentStatusRequestDto.builder()
                .paymentStatus(PaymentStatus.PAID)
                .build();
        mockMvc.perform(put("/api/orders/" + orderId + "/payment-status")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payReq)))
                .andExpect(status().isForbidden());

        // Admin marks order as PAID
        mockMvc.perform(put("/api/orders/" + orderId + "/payment-status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payReq)))
                .andExpect(status().isOk());

        Order paidOrder = orderRepository.findById(orderId).orElseThrow();
        assertEquals(PaymentStatus.PAID, paidOrder.getPaymentStatus());

        // User cancels their own paid order -> payment status becomes REFUNDED
        MvcResult cancelRes = mockMvc.perform(post("/api/orders/" + orderId + "/cancel")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode cancelJson = objectMapper.readTree(cancelRes.getResponse().getContentAsString()).get("data");
        assertEquals("CANCELLED", cancelJson.get("status").asText());
        assertEquals("REFUNDED", cancelJson.get("paymentStatus").asText());
    }

    @Test
    void testCancellationAfterTwoHoursWindowRejected() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String userToken = registerAndObtainUserToken("timecancel_" + suffix, "timecancel_" + suffix + "@test.com", "pass123");

        Product product = productRepository.save(Product.builder()
                .name("TimeCancelProd_" + suffix)
                .price(10.0)
                .stock(10)
                .category(testCategory)
                .active(true)
                .build());

        // Cart checkout
        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CartItemRequestDto.builder()
                                .productId(product.getId())
                                .quantity(1)
                                .build())))
                .andExpect(status().isOk());

        MvcResult checkoutRes = mockMvc.perform(post("/api/cart/checkout")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CheckoutRequestDto.builder()
                                .shippingAddress("Time Address")
                                .paymentMethod(PaymentMethod.CASH_ON_DELIVERY)
                                .build())))
                .andExpect(status().isCreated())
                .andReturn();

        Long orderId = objectMapper.readTree(checkoutRes.getResponse().getContentAsString()).get("data").get("id").asLong();

        // Manipulate orderDate directly in database to simulate 3 hours elapsed (> 2 hours)
        Order order = orderRepository.findById(orderId).orElseThrow();
        order.setOrderDate(LocalDateTime.now().minusHours(3));
        orderRepository.save(order);

        // USER attempt to cancel is rejected
        MvcResult rejectResult = mockMvc.perform(post("/api/orders/" + orderId + "/cancel")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isBadRequest())
                .andReturn();

        String responseStr = rejectResult.getResponse().getContentAsString();
        assertTrue(responseStr.contains("Orders can only be cancelled within 2 hours of placing them"));

        // ADMIN can still cancel this older order via staff PUT endpoint (no 2-hour restriction)
        OrderStatusRequestDto adminCancelReq = new OrderStatusRequestDto();
        adminCancelReq.setStatus("CANCELLED");
        mockMvc.perform(put("/api/orders/" + orderId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminCancelReq)))
                .andExpect(status().isOk());

        Order afterAdminCancel = orderRepository.findById(orderId).orElseThrow();
        assertEquals("CANCELLED", afterAdminCancel.getStatus());
    }

    @Test
    void testCancelAnotherUsersOrderForbidden() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String user1Token = registerAndObtainUserToken("u1_" + suffix, "u1_" + suffix + "@test.com", "pass123");
        String user2Token = registerAndObtainUserToken("u2_" + suffix, "u2_" + suffix + "@test.com", "pass123");

        Product product = productRepository.save(Product.builder()
                .name("OtherUserOrderProd_" + suffix)
                .price(15.0)
                .stock(10)
                .category(testCategory)
                .active(true)
                .build());

        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CartItemRequestDto.builder()
                                .productId(product.getId())
                                .quantity(1)
                                .build())))
                .andExpect(status().isOk());

        MvcResult checkoutRes = mockMvc.perform(post("/api/cart/checkout")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CheckoutRequestDto.builder()
                                .shippingAddress("U1 Address")
                                .paymentMethod(PaymentMethod.CASH_ON_DELIVERY)
                                .build())))
                .andExpect(status().isCreated())
                .andReturn();

        Long orderId = objectMapper.readTree(checkoutRes.getResponse().getContentAsString()).get("data").get("id").asLong();

        // User 2 cannot cancel User 1's order (403 Forbidden)
        mockMvc.perform(post("/api/orders/" + orderId + "/cancel")
                        .header("Authorization", "Bearer " + user2Token))
                .andExpect(status().isForbidden());
    }

    @Test
    void testStaffWalkInOrderCreationUnaffected() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User walkInUser = userRepository.findByUsername("admin").orElseThrow();

        Product product = productRepository.save(Product.builder()
                .name("WalkInProd_" + suffix)
                .price(18.0)
                .stock(30)
                .category(testCategory)
                .active(true)
                .build());

        OrderRequestDto orderReq = new OrderRequestDto(
                walkInUser.getId(),
                List.of(new OrderItemRequestDto(product.getId(), 4))
        );

        MvcResult staffOrderRes = mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + stockToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderReq)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(staffOrderRes.getResponse().getContentAsString()).get("data");
        assertEquals("PENDING", json.get("status").asText());
        assertEquals("UNPAID", json.get("paymentStatus").asText());
        assertTrue(json.get("paymentMethod").isNull());
        assertEquals(72.0, json.get("totalAmount").asDouble());

        // Stock deducted from 30 to 26
        assertEquals(26, productRepository.findById(product.getId()).orElseThrow().getStock());
    }

    @Test
    void testCheckoutWithoutPaymentMethodRejected() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String userToken = registerAndObtainUserToken("nopaym_" + suffix, "nopaym_" + suffix + "@test.com", "pass123");

        Product product = productRepository.save(Product.builder()
                .name("NoPayProd_" + suffix)
                .price(25.0)
                .stock(10)
                .category(testCategory)
                .active(true)
                .build());

        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CartItemRequestDto.builder()
                                .productId(product.getId())
                                .quantity(1)
                                .build())))
                .andExpect(status().isOk());

        // 1. Checkout with missing paymentMethod (null in DTO)
        CheckoutRequestDto missingMethodDto = CheckoutRequestDto.builder()
                .shippingAddress("123 Street")
                .build();

        mockMvc.perform(post("/api/cart/checkout")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(missingMethodDto)))
                .andExpect(status().isBadRequest());

        // 2. Checkout with explicit json missing paymentMethod
        String rawJsonWithoutMethod = "{\"shippingAddress\":\"123 Street\"}";
        mockMvc.perform(post("/api/cart/checkout")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(rawJsonWithoutMethod))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testCheckoutWithEachValidPaymentMethodAndPersistence() throws Exception {
        for (PaymentMethod method : PaymentMethod.values()) {
            String suffix = UUID.randomUUID().toString().substring(0, 8);
            String userToken = registerAndObtainUserToken("paym_" + method.name().toLowerCase() + "_" + suffix,
                    "paym_" + method.name().toLowerCase() + "_" + suffix + "@test.com", "pass123");

            Product product = productRepository.save(Product.builder()
                    .name("Prod_" + method.name() + "_" + suffix)
                    .price(20.0)
                    .stock(10)
                    .category(testCategory)
                    .active(true)
                    .build());

            mockMvc.perform(post("/api/cart/items")
                            .header("Authorization", "Bearer " + userToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(CartItemRequestDto.builder()
                                    .productId(product.getId())
                                    .quantity(1)
                                    .build())))
                    .andExpect(status().isOk());

            CheckoutRequestDto checkoutDto = CheckoutRequestDto.builder()
                    .shippingAddress("Address for " + method.name())
                    .customerNote("Note for " + method.name())
                    .paymentMethod(method)
                    .build();

            // 1. Checkout succeeds
            MvcResult checkoutRes = mockMvc.perform(post("/api/cart/checkout")
                            .header("Authorization", "Bearer " + userToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(checkoutDto)))
                    .andExpect(status().isCreated())
                    .andReturn();

            JsonNode checkoutJson = objectMapper.readTree(checkoutRes.getResponse().getContentAsString()).get("data");
            Long orderId = checkoutJson.get("id").asLong();
            assertEquals(method.name(), checkoutJson.get("paymentMethod").asText());

            // 2. Visible in GET /api/orders/{id}
            MvcResult getByIdRes = mockMvc.perform(get("/api/orders/" + orderId)
                            .header("Authorization", "Bearer " + userToken))
                    .andExpect(status().isOk())
                    .andReturn();
            JsonNode getByIdJson = objectMapper.readTree(getByIdRes.getResponse().getContentAsString()).get("data");
            assertEquals(method.name(), getByIdJson.get("paymentMethod").asText());

            // 3. Visible in GET /api/orders/my
            MvcResult getMyOrdersRes = mockMvc.perform(get("/api/orders/my")
                            .header("Authorization", "Bearer " + userToken))
                    .andExpect(status().isOk())
                    .andReturn();
            JsonNode getMyOrdersJson = objectMapper.readTree(getMyOrdersRes.getResponse().getContentAsString()).get("data");
            assertTrue(getMyOrdersJson.isArray());
            boolean found = false;
            for (JsonNode orderNode : getMyOrdersJson) {
                if (orderNode.get("id").asLong() == orderId) {
                    assertEquals(method.name(), orderNode.get("paymentMethod").asText());
                    found = true;
                    break;
                }
            }
            assertTrue(found, "Order with id " + orderId + " should be found in GET /api/orders/my");
        }
    }

    @Test
    void testRule1Rule2Rule3OrderTransitions() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String userToken = registerAndObtainUserToken("rulesuser_" + suffix, "rulesuser_" + suffix + "@test.com", "pass123");

        Product product = productRepository.save(Product.builder()
                .name("RulesProd_" + suffix)
                .price(100.0)
                .stock(50)
                .category(testCategory)
                .active(true)
                .build());

        // Helper to checkout an order
        java.util.function.Supplier<Long> createOrder = () -> {
            try {
                mockMvc.perform(post("/api/cart/items")
                                .header("Authorization", "Bearer " + userToken)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(CartItemRequestDto.builder()
                                        .productId(product.getId())
                                        .quantity(1)
                                        .build())))
                        .andExpect(status().isOk());

                MvcResult checkoutRes = mockMvc.perform(post("/api/cart/checkout")
                                .header("Authorization", "Bearer " + userToken)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(CheckoutRequestDto.builder()
                                        .shippingAddress("Rules Address")
                                        .paymentMethod(PaymentMethod.BANK_TRANSFER)
                                        .build())))
                        .andExpect(status().isCreated())
                        .andReturn();

                return objectMapper.readTree(checkoutRes.getResponse().getContentAsString()).get("data").get("id").asLong();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        };

        // 1. ADMIN cancels an order that is PAID, within 2 hours of orderDate -> paymentStatus becomes REFUNDED
        Long order1 = createOrder.get();
        mockMvc.perform(put("/api/orders/" + order1 + "/payment-status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new PaymentStatusRequestDto(PaymentStatus.PAID))))
                .andExpect(status().isOk());
        OrderStatusRequestDto cancelReq = new OrderStatusRequestDto("CANCELLED");
        MvcResult adminCancelWithin2hRes = mockMvc.perform(put("/api/orders/" + order1)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cancelReq)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode cancel1Json = objectMapper.readTree(adminCancelWithin2hRes.getResponse().getContentAsString()).get("data");
        assertEquals("CANCELLED", cancel1Json.get("status").asText());
        assertEquals("REFUNDED", cancel1Json.get("paymentStatus").asText());

        // 2. ADMIN cancels an order that is PAID, more than 2 hours after orderDate -> paymentStatus stays PAID
        Long order2 = createOrder.get();
        mockMvc.perform(put("/api/orders/" + order2 + "/payment-status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new PaymentStatusRequestDto(PaymentStatus.PAID))))
                .andExpect(status().isOk());
        Order ord2 = orderRepository.findById(order2).orElseThrow();
        ord2.setOrderDate(LocalDateTime.now().minusHours(3));
        orderRepository.save(ord2);

        MvcResult adminCancelAfter2hRes = mockMvc.perform(put("/api/orders/" + order2)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cancelReq)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode cancel2Json = objectMapper.readTree(adminCancelAfter2hRes.getResponse().getContentAsString()).get("data");
        assertEquals("CANCELLED", cancel2Json.get("status").asText());
        assertEquals("PAID", cancel2Json.get("paymentStatus").asText());

        // 3. ADMIN cancels an order that is UNPAID, any time -> paymentStatus stays UNPAID in both cases
        // 3a. within 2 hours
        Long order3a = createOrder.get();
        MvcResult cancel3aRes = mockMvc.perform(put("/api/orders/" + order3a)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cancelReq)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode cancel3aJson = objectMapper.readTree(cancel3aRes.getResponse().getContentAsString()).get("data");
        assertEquals("CANCELLED", cancel3aJson.get("status").asText());
        assertEquals("UNPAID", cancel3aJson.get("paymentStatus").asText());

        // 3b. after 2 hours
        Long order3b = createOrder.get();
        Order ord3b = orderRepository.findById(order3b).orElseThrow();
        ord3b.setOrderDate(LocalDateTime.now().minusHours(4));
        orderRepository.save(ord3b);
        MvcResult cancel3bRes = mockMvc.perform(put("/api/orders/" + order3b)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cancelReq)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode cancel3bJson = objectMapper.readTree(cancel3bRes.getResponse().getContentAsString()).get("data");
        assertEquals("CANCELLED", cancel3bJson.get("status").asText());
        assertEquals("UNPAID", cancel3bJson.get("paymentStatus").asText());

        // 4. USER self-cancels within 2 hours while PAID: confirm REFUNDED
        Long order4 = createOrder.get();
        mockMvc.perform(put("/api/orders/" + order4 + "/payment-status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new PaymentStatusRequestDto(PaymentStatus.PAID))))
                .andExpect(status().isOk());
        MvcResult selfCancelRes = mockMvc.perform(post("/api/orders/" + order4 + "/cancel")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode selfCancelJson = objectMapper.readTree(selfCancelRes.getResponse().getContentAsString()).get("data");
        assertEquals("CANCELLED", selfCancelJson.get("status").asText());
        assertEquals("REFUNDED", selfCancelJson.get("paymentStatus").asText());

        // 5. After a CANCELLED order: attempt a further status or paymentStatus change by ADMIN -> rejected with clear error
        MvcResult rejectStatusOnCancelled = mockMvc.perform(put("/api/orders/" + order1)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new OrderStatusRequestDto("CONFIRMED"))))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertTrue(rejectStatusOnCancelled.getResponse().getContentAsString().toLowerCase().contains("cancelled and can no longer be modified"));

        MvcResult rejectPaymentOnCancelled = mockMvc.perform(put("/api/orders/" + order1 + "/payment-status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new PaymentStatusRequestDto(PaymentStatus.PAID))))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertTrue(rejectPaymentOnCancelled.getResponse().getContentAsString().toLowerCase().contains("cancelled and can no longer be modified"));

        // 6. ADMIN changes a PENDING order's status to COMPLETED while paymentStatus is UNPAID:
        // confirm paymentStatus automatically becomes PAID in the same response
        Long order6 = createOrder.get();
        Order ord6Pre = orderRepository.findById(order6).orElseThrow();
        assertEquals("PENDING", ord6Pre.getStatus());
        assertEquals(PaymentStatus.UNPAID, ord6Pre.getPaymentStatus());

        MvcResult completeRes = mockMvc.perform(put("/api/orders/" + order6)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new OrderStatusRequestDto("COMPLETED"))))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode completeJson = objectMapper.readTree(completeRes.getResponse().getContentAsString()).get("data");
        assertEquals("COMPLETED", completeJson.get("status").asText());
        assertEquals("PAID", completeJson.get("paymentStatus").asText());

        // 7. After a COMPLETED order: attempt a further status or paymentStatus change by ADMIN -> rejected with clear error
        MvcResult rejectStatusOnCompleted = mockMvc.perform(put("/api/orders/" + order6)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new OrderStatusRequestDto("CONFIRMED"))))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertTrue(rejectStatusOnCompleted.getResponse().getContentAsString().toLowerCase().contains("completed and can no longer be modified"));

        MvcResult rejectPaymentOnCompleted = mockMvc.perform(put("/api/orders/" + order6 + "/payment-status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new PaymentStatusRequestDto(PaymentStatus.UNPAID))))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertTrue(rejectPaymentOnCompleted.getResponse().getContentAsString().toLowerCase().contains("completed and can no longer be modified"));
    }
}
