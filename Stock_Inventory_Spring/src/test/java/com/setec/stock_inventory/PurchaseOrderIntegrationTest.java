package com.setec.stock_inventory;

import com.setec.stock_inventory.dto.Request.PurchaseOrderItemRequestDto;
import com.setec.stock_inventory.dto.Request.PurchaseOrderRequestDto;
import com.setec.stock_inventory.dto.Request.SupplierRequestDto;
import com.setec.stock_inventory.dto.Response.PurchaseOrderResponseDto;
import com.setec.stock_inventory.dto.Response.SupplierResponseDto;
import com.setec.stock_inventory.entity.Category;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.entity.StockMovement;
import com.setec.stock_inventory.entity.Supplier;
import com.setec.stock_inventory.entity.User;
import com.setec.stock_inventory.enums.MovementType;
import com.setec.stock_inventory.enums.PurchaseOrderStatus;
import com.setec.stock_inventory.enums.Role;
import com.setec.stock_inventory.exception.BadRequestException;
import com.setec.stock_inventory.repo.*;
import com.setec.stock_inventory.service.PurchaseOrderService;
import com.setec.stock_inventory.service.SupplierService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class PurchaseOrderIntegrationTest {

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @Autowired
    private SupplierService supplierService;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    private User testUser;
    private Category testCategory;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        testUser = userRepository.save(User.builder()
                .username("po_user_" + suffix)
                .email("po_user_" + suffix + "@test.com")
                .password("password123")
                .role(Role.ADMIN)
                .build());

        testCategory = categoryRepository.save(Category.builder()
                .name("POCat_" + suffix)
                .description("PO Test Category")
                .build());
    }

    @Test
    void testCreateAndReceivePurchaseOrderLifecycle() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        // 1. Create a Supplier
        SupplierResponseDto supplier = supplierService.createSupplier(SupplierRequestDto.builder()
                .name("Supplier_" + suffix)
                .contactPerson("John Doe")
                .phone("012345678")
                .email("supplier_" + suffix + "@example.com")
                .address("123 Main St")
                .build());
        assertNotNull(supplier.getId());
        assertTrue(supplier.isActive());

        // 2. Create Products
        Product product1 = productRepository.save(Product.builder()
                .name("PO_Prod1_" + suffix)
                .price(30.0)
                .stock(10)
                .category(testCategory)
                .build());

        Product product2 = productRepository.save(Product.builder()
                .name("PO_Prod2_" + suffix)
                .price(50.0)
                .stock(5)
                .category(testCategory)
                .build());

        // 3. Create a PurchaseOrder with items:
        // Item 1: qty = 4, costPrice = 25.0 (subtotal = 100.0)
        // Item 2: qty = 2, costPrice = 40.0 (subtotal = 80.0)
        // Expected totalCost = 180.0
        PurchaseOrderItemRequestDto item1 = PurchaseOrderItemRequestDto.builder()
                .productId(product1.getId())
                .quantity(4)
                .costPrice(25.0)
                .build();

        PurchaseOrderItemRequestDto item2 = PurchaseOrderItemRequestDto.builder()
                .productId(product2.getId())
                .quantity(2)
                .costPrice(40.0)
                .build();

        PurchaseOrderRequestDto poRequest = PurchaseOrderRequestDto.builder()
                .supplierId(supplier.getId())
                .items(List.of(item1, item2))
                .build();

        PurchaseOrderResponseDto createdPo = purchaseOrderService.createPurchaseOrder(poRequest);
        assertNotNull(createdPo.getId());
        assertEquals(PurchaseOrderStatus.PENDING, createdPo.getStatus());
        assertEquals(180.0, createdPo.getTotalCost());
        assertEquals(2, createdPo.getItems().size());

        // Initial stocks should still be untouched
        assertEquals(10, productRepository.findById(product1.getId()).orElseThrow().getStock());
        assertEquals(5, productRepository.findById(product2.getId()).orElseThrow().getStock());

        // 4. Receive the PurchaseOrder
        PurchaseOrderResponseDto receivedPo = purchaseOrderService.receivePurchaseOrder(createdPo.getId());
        assertEquals(PurchaseOrderStatus.RECEIVED, receivedPo.getStatus());

        // Confirm Product stocks increased
        Product updatedProd1 = productRepository.findById(product1.getId()).orElseThrow();
        assertEquals(14, updatedProd1.getStock()); // 10 + 4 = 14

        Product updatedProd2 = productRepository.findById(product2.getId()).orElseThrow();
        assertEquals(7, updatedProd2.getStock()); // 5 + 2 = 7

        // Confirm StockMovement rows appeared
        List<StockMovement> movementsProd1 = stockMovementRepository.findByProductIdOrderByCreatedAtDesc(product1.getId());
        assertFalse(movementsProd1.isEmpty());
        StockMovement sm1 = movementsProd1.get(0);
        assertEquals(MovementType.STOCK_IN, sm1.getType());
        assertEquals(4, sm1.getQuantity());
        assertEquals(10, sm1.getPreviousStock());
        assertEquals(14, sm1.getNewStock());
        assertEquals("Purchase Order #" + createdPo.getId(), sm1.getReason());

        List<StockMovement> movementsProd2 = stockMovementRepository.findByProductIdOrderByCreatedAtDesc(product2.getId());
        assertFalse(movementsProd2.isEmpty());
        StockMovement sm2 = movementsProd2.get(0);
        assertEquals(MovementType.STOCK_IN, sm2.getType());
        assertEquals(2, sm2.getQuantity());
        assertEquals(5, sm2.getPreviousStock());
        assertEquals(7, sm2.getNewStock());
        assertEquals("Purchase Order #" + createdPo.getId(), sm2.getReason());

        // 5. Try receiving again -> Must be rejected with clear message
        BadRequestException ex = assertThrows(BadRequestException.class, () -> {
            purchaseOrderService.receivePurchaseOrder(createdPo.getId());
        });
        assertTrue(ex.getMessage().contains("Cannot receive purchase order with status: RECEIVED"));
    }

    @Test
    void testCancelPurchaseOrderLeavesStockUntouched() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        SupplierResponseDto supplier = supplierService.createSupplier(SupplierRequestDto.builder()
                .name("Supplier_Cancel_" + suffix)
                .build());

        Product product = productRepository.save(Product.builder()
                .name("PO_Prod_Cancel_" + suffix)
                .price(20.0)
                .stock(10)
                .category(testCategory)
                .build());

        PurchaseOrderResponseDto createdPo = purchaseOrderService.createPurchaseOrder(PurchaseOrderRequestDto.builder()
                .supplierId(supplier.getId())
                .items(List.of(PurchaseOrderItemRequestDto.builder()
                        .productId(product.getId())
                        .quantity(5)
                        .costPrice(15.0)
                        .build()))
                .build());

        assertEquals(PurchaseOrderStatus.PENDING, createdPo.getStatus());

        // Cancel while PENDING
        PurchaseOrderResponseDto cancelledPo = purchaseOrderService.cancelPurchaseOrder(createdPo.getId());
        assertEquals(PurchaseOrderStatus.CANCELLED, cancelledPo.getStatus());

        // Verify stock is untouched
        Product unchangedProd = productRepository.findById(product.getId()).orElseThrow();
        assertEquals(10, unchangedProd.getStock());

        // Verify no StockMovement row was created
        List<StockMovement> movements = stockMovementRepository.findByProductIdOrderByCreatedAtDesc(product.getId());
        assertTrue(movements.isEmpty());

        // Try cancelling again -> Must be rejected
        BadRequestException cancelEx = assertThrows(BadRequestException.class, () -> {
            purchaseOrderService.cancelPurchaseOrder(createdPo.getId());
        });
        assertTrue(cancelEx.getMessage().contains("Cannot cancel purchase order with status: CANCELLED"));

        // Try receiving a cancelled order -> Must be rejected
        BadRequestException receiveEx = assertThrows(BadRequestException.class, () -> {
            purchaseOrderService.receivePurchaseOrder(createdPo.getId());
        });
        assertTrue(receiveEx.getMessage().contains("Cannot receive purchase order with status: CANCELLED"));
    }

    @Test
    void testSupplierSoftDeleteWhenReferencedByPurchaseOrder() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        SupplierResponseDto supplier = supplierService.createSupplier(SupplierRequestDto.builder()
                .name("Supplier_SoftDelete_" + suffix)
                .build());

        Product product = productRepository.save(Product.builder()
                .name("Prod_SoftDelete_" + suffix)
                .price(20.0)
                .stock(10)
                .category(testCategory)
                .build());

        purchaseOrderService.createPurchaseOrder(PurchaseOrderRequestDto.builder()
                .supplierId(supplier.getId())
                .items(List.of(PurchaseOrderItemRequestDto.builder()
                        .productId(product.getId())
                        .quantity(2)
                        .costPrice(10.0)
                        .build()))
                .build());

        // Delete supplier with referenced PurchaseOrder -> Should soft delete (active = false)
        supplierService.deleteSupplier(supplier.getId());

        Supplier softDeletedSupplier = supplierRepository.findById(supplier.getId()).orElseThrow();
        assertFalse(softDeletedSupplier.isActive());
    }
}
