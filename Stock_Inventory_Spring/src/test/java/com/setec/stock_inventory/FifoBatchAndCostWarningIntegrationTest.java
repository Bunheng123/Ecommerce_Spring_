package com.setec.stock_inventory;

import com.setec.stock_inventory.dto.Request.CartItemRequestDto;
import com.setec.stock_inventory.dto.Request.CheckoutRequestDto;
import com.setec.stock_inventory.dto.Request.PurchaseOrderItemRequestDto;
import com.setec.stock_inventory.dto.Request.PurchaseOrderRequestDto;
import com.setec.stock_inventory.dto.Request.WholesaleOrderItemRequestDto;
import com.setec.stock_inventory.dto.Request.WholesaleOrderRequestDto;
import com.setec.stock_inventory.dto.Response.OrderResponseDto;
import com.setec.stock_inventory.dto.Response.ProductResponseDto;
import com.setec.stock_inventory.dto.Response.PurchaseOrderResponseDto;
import com.setec.stock_inventory.dto.Response.StockBatchResponseDto;
import com.setec.stock_inventory.dto.Response.WholesaleOrderResponseDto;
import com.setec.stock_inventory.entity.*;
import com.setec.stock_inventory.enums.BatchStatus;
import com.setec.stock_inventory.enums.BuyerType;
import com.setec.stock_inventory.enums.PaymentMethod;
import com.setec.stock_inventory.enums.Role;
import com.setec.stock_inventory.repo.*;
import com.setec.stock_inventory.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class FifoBatchAndCostWarningIntegrationTest {

    @Autowired
    private ProductService productService;

    @Autowired
    private StockBatchService stockBatchService;

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @Autowired
    private WholesaleOrderService wholesaleOrderService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private CartService cartService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private StockBatchRepository stockBatchRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private WholesaleBuyerRepository wholesaleBuyerRepository;

    @Autowired
    private UserRepository userRepository;

    private User adminUser;
    private User customerUser;
    private Category testCategory;
    private Supplier testSupplier;
    private WholesaleBuyer testBuyer;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        adminUser = userRepository.save(User.builder()
                .username("admin_" + suffix)
                .email("admin_" + suffix + "@example.com")
                .password("pass123")
                .fullName("Admin " + suffix)
                .role(Role.ADMIN)
                .build());

        customerUser = userRepository.save(User.builder()
                .username("cust_" + suffix)
                .email("cust_" + suffix + "@example.com")
                .password("pass123")
                .fullName("Customer " + suffix)
                .role(Role.USER)
                .build());

        testCategory = categoryRepository.save(Category.builder()
                .name("Cat_" + suffix)
                .description("Desc_" + suffix)
                .build());

        testSupplier = supplierRepository.save(Supplier.builder()
                .name("Supplier_" + suffix)
                .contactPerson("Agent " + suffix)
                .email("supp_" + suffix + "@example.com")
                .phone("123456789")
                .active(true)
                .build());

        testBuyer = wholesaleBuyerRepository.save(WholesaleBuyer.builder()
                .name("Buyer_" + suffix)
                .contactPerson("Co_" + suffix)
                .email("buyer_" + suffix + "@example.com")
                .type(BuyerType.ORGANIZATION)
                .active(true)
                .build());

        // Authenticate as admin by default
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(adminUser.getUsername(), null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))
        );
    }

    @Test
    @DisplayName("1. Verify 3-batch FIFO scenario: Depleted batch becomes EXHAUSTED (kept in DB), partial batch is NEXT OUT, new batch is ACTIVE")
    @Transactional
    void testThreeBatchFifoScenario() {
        // Create product with 0 initial stock
        Product product = productRepository.save(Product.builder()
                .name("FIFO Test Product")
                .category(testCategory)
                .price(100.00)
                .costPrice(50.00)
                .stock(0)
                .active(true)
                .build());

        // Batch 1: 10 units at $40.00
        StockBatch b1 = stockBatchService.createBatch(
                product, null, BigDecimal.valueOf(40.00), 10, LocalDateTime.now().minusHours(3), null
        );

        // Batch 2: 15 units at $45.00
        StockBatch b2 = stockBatchService.createBatch(
                product, null, BigDecimal.valueOf(45.00), 15, LocalDateTime.now().minusHours(2), null
        );

        // Batch 3: 20 units at $50.00
        StockBatch b3 = stockBatchService.createBatch(
                product, null, BigDecimal.valueOf(50.00), 20, LocalDateTime.now().minusHours(1), null
        );

        product.setStock(45);
        productRepository.save(product);

        // Deplete 14 units:
        // - Batch 1 (10 units) -> 0 remaining (EXHAUSTED)
        // - Batch 2 (15 units) -> 11 remaining (ACTIVE, next FIFO)
        // - Batch 3 (20 units) -> 20 remaining (ACTIVE)
        stockBatchService.depleteStockFifo(product, 14);

        List<StockBatchResponseDto> ledger = productService.getProductBatches(product.getId());
        assertEquals(3, ledger.size(), "All 3 batches must be preserved in database ledger");

        // Chronological order verification
        StockBatchResponseDto dto1 = ledger.get(0);
        StockBatchResponseDto dto2 = ledger.get(1);
        StockBatchResponseDto dto3 = ledger.get(2);

        assertEquals(b1.getBatchNumber(), dto1.getBatchNumber());
        assertEquals(0, dto1.getRemainingQuantity(), "Batch 1 must have 0 remaining quantity");
        assertEquals(BatchStatus.EXHAUSTED, dto1.getStatus(), "Batch 1 must be permanently marked EXHAUSTED");
        assertFalse(dto1.isNextFifo(), "Exhausted batch cannot be next FIFO");

        assertEquals(b2.getBatchNumber(), dto2.getBatchNumber());
        assertEquals(11, dto2.getRemainingQuantity(), "Batch 2 should have 11 remaining units");
        assertEquals(BatchStatus.ACTIVE, dto2.getStatus(), "Batch 2 must remain ACTIVE");
        assertTrue(dto2.isNextFifo(), "Oldest active batch (Batch 2) MUST be flagged as nextFifo=true");

        assertEquals(b3.getBatchNumber(), dto3.getBatchNumber());
        assertEquals(20, dto3.getRemainingQuantity(), "Batch 3 should have all 20 remaining units");
        assertEquals(BatchStatus.ACTIVE, dto3.getStatus(), "Batch 3 must be ACTIVE");
        assertFalse(dto3.isNextFifo(), "Batch 3 is not the oldest active batch, nextFifo must be false");
    }

    @Test
    @DisplayName("2. Verify Below Cost Price warning indicators and calculations in Product DTOs")
    @Transactional
    void testBelowCostPriceWarningIndicators() {
        // Product where price ($30.00) < costPrice ($40.00)
        Product product = productRepository.save(Product.builder()
                .name("Unprofitable Product")
                .category(testCategory)
                .price(30.00)
                .costPrice(40.00)
                .stock(5)
                .active(true)
                .build());

        // Batch cost is $40.00
        stockBatchService.createBatch(product, null, BigDecimal.valueOf(40.00), 5, LocalDateTime.now(), null);

        ProductResponseDto dto = productService.getProductById(product.getId());

        assertTrue(dto.isBelowCostPrice(), "Product priced below cost must have belowCostPrice = true");
        assertNotNull(dto.getPriceWarning(), "Must provide human-readable priceWarning message");
        assertTrue(dto.getPriceWarning().contains("below cost price"), "priceWarning must describe below-cost loss");
        assertEquals(new BigDecimal("40.00"), dto.getActiveFifoUnitCost(), "Active FIFO unit cost should be $40.00");

        // Profitable product: price ($50.00) > costPrice ($35.00)
        Product profitable = productRepository.save(Product.builder()
                .name("Profitable Product")
                .category(testCategory)
                .price(50.00)
                .costPrice(35.00)
                .stock(5)
                .active(true)
                .build());
        stockBatchService.createBatch(profitable, null, BigDecimal.valueOf(35.00), 5, LocalDateTime.now(), null);

        ProductResponseDto profitableDto = productService.getProductById(profitable.getId());
        assertFalse(profitableDto.isBelowCostPrice(), "Profitable product must have belowCostPrice = false");
        assertNull(profitableDto.getPriceWarning(), "Profitable product must have null priceWarning");
    }

    @Test
    @DisplayName("3. Verify Customer Order Checkout depletes FIFO batches and Order Cancellation restores into most recent batch")
    @Transactional
    void testOrderCheckoutAndCancelFifoRestoration() {
        Product product = productRepository.save(Product.builder()
                .name("Checkout FIFO Product")
                .category(testCategory)
                .price(25.00)
                .costPrice(15.00)
                .stock(10)
                .active(true)
                .build());

        // Batch 1: 5 units
        stockBatchService.createBatch(product, null, BigDecimal.valueOf(14.00), 5, LocalDateTime.now().minusHours(2), null);
        // Batch 2: 5 units
        stockBatchService.createBatch(product, null, BigDecimal.valueOf(16.00), 5, LocalDateTime.now().minusHours(1), null);

        // Switch to customer authentication to add to cart & checkout
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(customerUser.getUsername(), null,
                        List.of(new SimpleGrantedAuthority("ROLE_USER")))
        );

        cartService.addItem(CartItemRequestDto.builder().productId(product.getId()).quantity(7).build());

        CheckoutRequestDto checkout = CheckoutRequestDto.builder()
                .shippingAddress("123 Test St")
                .paymentMethod(PaymentMethod.CASH_ON_DELIVERY)
                .build();

        OrderResponseDto order = orderService.checkoutCart(checkout);
        assertNotNull(order);

        // Check product stock and batches after checkout:
        // Total stock remaining should be 3
        Product afterCheckoutProduct = productRepository.findById(product.getId()).orElseThrow();
        assertEquals(3, afterCheckoutProduct.getStock());

        // Check batches: Batch 1 (5 units) should be EXHAUSTED (0 remaining); Batch 2 should have 3 remaining
        List<StockBatchResponseDto> batchesAfterCheckout = productService.getProductBatches(product.getId());
        assertEquals(0, batchesAfterCheckout.get(0).getRemainingQuantity());
        assertEquals(BatchStatus.EXHAUSTED, batchesAfterCheckout.get(0).getStatus());
        assertEquals(3, batchesAfterCheckout.get(1).getRemainingQuantity());
        assertEquals(BatchStatus.ACTIVE, batchesAfterCheckout.get(1).getStatus());

        // Now customer self-cancels the order
        orderService.selfCancelOrder(order.getId());

        // Check stock restored: 3 + 7 = 10
        Product afterCancelProduct = productRepository.findById(product.getId()).orElseThrow();
        assertEquals(10, afterCancelProduct.getStock());

        // Check batches restored: Most recently depleted batch (Batch 2) was refilled to 5,
        // and Batch 1 had remaining 5 restored and set back to ACTIVE!
        List<StockBatchResponseDto> batchesAfterCancel = productService.getProductBatches(product.getId());
        assertEquals(5, batchesAfterCancel.get(0).getRemainingQuantity());
        assertEquals(BatchStatus.ACTIVE, batchesAfterCancel.get(0).getStatus());
        assertEquals(5, batchesAfterCancel.get(1).getRemainingQuantity());
        assertEquals(BatchStatus.ACTIVE, batchesAfterCancel.get(1).getStatus());
    }

    @Test
    @DisplayName("4. Verify Wholesale Order completion depletes stock FIFO and flags items below cost")
    @Transactional
    void testWholesaleOrderFifoAndCostWarning() {
        // Authenticate as admin
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(adminUser.getUsername(), null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))
        );

        Product product = productRepository.save(Product.builder()
                .name("Wholesale Item")
                .category(testCategory)
                .price(100.00)
                .costPrice(60.00)
                .stock(20)
                .active(true)
                .build());

        stockBatchService.createBatch(product, null, BigDecimal.valueOf(60.00), 20, LocalDateTime.now(), null);

        // Create wholesale order with wholesalePrice = $45.00 (below cost price of $60.00)
        WholesaleOrderRequestDto request = WholesaleOrderRequestDto.builder()
                .buyerId(testBuyer.getId())
                .items(List.of(
                        WholesaleOrderItemRequestDto.builder()
                                .productId(product.getId())
                                .quantity(8)
                                .wholesalePrice(45.00)
                                .build()
                ))
                .build();

        WholesaleOrderResponseDto created = wholesaleOrderService.createWholesaleOrder(request);
        assertTrue(created.isBelowCostPrice(), "Wholesale order with item priced below cost must be flagged");
        assertTrue(created.getItems().get(0).isBelowCostPrice(), "Wholesale line item must be flagged belowCostPrice=true");

        // Complete the wholesale order -> depletes 8 units
        WholesaleOrderResponseDto completed = wholesaleOrderService.completeWholesaleOrder(created.getId());
        assertEquals("COMPLETED", completed.getStatus().name());

        Product updatedProduct = productRepository.findById(product.getId()).orElseThrow();
        assertEquals(12, updatedProduct.getStock(), "Stock should be reduced from 20 to 12");

        List<StockBatchResponseDto> batches = productService.getProductBatches(product.getId());
        assertEquals(12, batches.get(0).getRemainingQuantity(), "Batch should have 12 remaining units");
    }

    @Test
    @DisplayName("5. Verify Purchase Order reception creates StockBatch and updates product.costPrice")
    @Transactional
    void testPurchaseOrderReceptionCreatesBatch() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(adminUser.getUsername(), null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))
        );

        Product product = productRepository.save(Product.builder()
                .name("PO Restock Product")
                .category(testCategory)
                .price(80.00)
                .costPrice(40.00)
                .stock(5)
                .active(true)
                .build());

        PurchaseOrderRequestDto poReq = PurchaseOrderRequestDto.builder()
                .supplierId(testSupplier.getId())
                .items(List.of(
                        PurchaseOrderItemRequestDto.builder()
                                .productId(product.getId())
                                .quantity(15)
                                .costPrice(52.50) // New supplier cost higher than old $40.00
                                .build()
                ))
                .build();

        PurchaseOrderResponseDto createdPo = purchaseOrderService.createPurchaseOrder(poReq);
        assertEquals("PENDING", createdPo.getStatus().name());

        // Receive the purchase order
        PurchaseOrderResponseDto receivedPo = purchaseOrderService.receivePurchaseOrder(createdPo.getId());
        assertEquals("RECEIVED", receivedPo.getStatus().name());

        Product reloadedProduct = productRepository.findById(product.getId()).orElseThrow();
        assertEquals(20, reloadedProduct.getStock(), "Stock should increase from 5 to 20");
        assertEquals(52.50, reloadedProduct.getCostPrice(), "Product cost price should be updated to latest supplier cost $52.50");

        List<StockBatchResponseDto> batches = productService.getProductBatches(product.getId());
        StockBatchResponseDto poBatch = batches.stream()
                .filter(b -> receivedPo.getId().equals(b.getPurchaseOrderId()))
                .findFirst()
                .orElse(null);

        assertNotNull(poBatch, "Must create a StockBatch linked to the received Purchase Order");
        assertEquals(new BigDecimal("52.50"), poBatch.getUnitCost());
        assertEquals(15, poBatch.getInitialQuantity());
        assertEquals(15, poBatch.getRemainingQuantity());
        assertEquals(BatchStatus.ACTIVE, poBatch.getStatus());
        assertTrue(poBatch.getSource().contains("Purchase Order #" + receivedPo.getId()));
    }

    @Test
    @DisplayName("6. Verify Startup Backfill automatically creates baseline StockBatch for existing products with stock > 0")
    @Transactional
    void testStartupBackfillInitialBatches() {
        Product productWithoutBatch = productRepository.save(Product.builder()
                .name("Legacy Unbatched Product")
                .category(testCategory)
                .price(65.00)
                .costPrice(32.50)
                .stock(18)
                .active(true)
                .build());

        // Ensure no batches exist yet for this product
        assertTrue(stockBatchRepository.findByProductIdOrderByReceivedDateAscIdAsc(productWithoutBatch.getId()).isEmpty());

        // Run backfill
        stockBatchService.backfillInitialBatches();

        List<StockBatchResponseDto> batches = productService.getProductBatches(productWithoutBatch.getId());
        assertEquals(1, batches.size(), "Startup backfill must create exactly 1 initial StockBatch");
        StockBatchResponseDto initialBatch = batches.get(0);
        assertEquals("BATCH-INIT-" + productWithoutBatch.getId(), initialBatch.getBatchNumber());
        assertEquals(18, initialBatch.getInitialQuantity());
        assertEquals(18, initialBatch.getRemainingQuantity());
        assertEquals(new BigDecimal("32.50"), initialBatch.getUnitCost());
        assertEquals(BatchStatus.ACTIVE, initialBatch.getStatus());
        assertEquals("Initial Stock", initialBatch.getSource());
    }
}
