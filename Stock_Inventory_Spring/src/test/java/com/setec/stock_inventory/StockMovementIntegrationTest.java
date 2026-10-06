package com.setec.stock_inventory;

import com.setec.stock_inventory.dto.Request.OrderItemRequestDto;
import com.setec.stock_inventory.dto.Request.OrderRequestDto;
import com.setec.stock_inventory.dto.Response.OrderResponseDto;
import com.setec.stock_inventory.entity.Category;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.entity.StockMovement;
import com.setec.stock_inventory.entity.User;
import com.setec.stock_inventory.enums.MovementType;
import com.setec.stock_inventory.enums.Role;
import com.setec.stock_inventory.repo.CategoryRepository;
import com.setec.stock_inventory.repo.ProductRepository;
import com.setec.stock_inventory.repo.StockMovementRepository;
import com.setec.stock_inventory.repo.UserRepository;
import com.setec.stock_inventory.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class StockMovementIntegrationTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void testOrderCreationAndCancellationStockMovements() {
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 8);

        // 1. Create a User
        User user = User.builder()
                .username("testuser_" + uniqueSuffix)
                .email("testuser_" + uniqueSuffix + "@example.com")
                .password("password123")
                .role(Role.STOCK)
                .build();
        user = userRepository.save(user);

        // 2. Create a Category
        Category category = Category.builder()
                .name("Cat_" + uniqueSuffix)
                .description("Test Category")
                .build();
        category = categoryRepository.save(category);

        // 3. Create a Product with stock = 20
        Product product = Product.builder()
                .name("Prod_" + uniqueSuffix)
                .description("Test Product")
                .price(10.0)
                .stock(20)
                .category(category)
                .build();
        product = productRepository.save(product);

        // 4. Create an Order with quantity = 5
        OrderItemRequestDto itemRequest = new OrderItemRequestDto();
        itemRequest.setProductId(product.getId());
        itemRequest.setQuantity(5);

        OrderRequestDto orderRequest = new OrderRequestDto();
        orderRequest.setUserId(user.getId());
        orderRequest.setOrderItemList(List.of(itemRequest));

        OrderResponseDto createdOrder = orderService.createOrder(orderRequest);
        assertNotNull(createdOrder);
        assertNotNull(createdOrder.getId());

        // Verify product stock deducted: 20 - 5 = 15
        Product updatedProduct = productRepository.findById(product.getId()).orElseThrow();
        assertEquals(15, updatedProduct.getStock());

        // Verify STOCK_OUT movement row
        List<StockMovement> movementsAfterCreate = stockMovementRepository.findByProductIdOrderByCreatedAtDesc(product.getId());
        assertEquals(1, movementsAfterCreate.size());

        StockMovement outMovement = movementsAfterCreate.get(0);
        assertEquals(MovementType.STOCK_OUT, outMovement.getType());
        assertEquals(5, outMovement.getQuantity());
        assertEquals(20, outMovement.getPreviousStock());
        assertEquals(15, outMovement.getNewStock());
        assertEquals("Order #" + createdOrder.getId(), outMovement.getReason());
        assertEquals(product.getId(), outMovement.getProduct().getId());

        // 5. Cancel the Order
        OrderResponseDto cancelledOrder = orderService.updateStatus(createdOrder.getId(), "CANCELLED");
        assertEquals("CANCELLED", cancelledOrder.getStatus());

        // Verify product stock restored: 15 + 5 = 20
        Product restoredProduct = productRepository.findById(product.getId()).orElseThrow();
        assertEquals(20, restoredProduct.getStock());

        // Verify STOCK_IN movement row
        List<StockMovement> movementsAfterCancel = stockMovementRepository.findByProductIdOrderByCreatedAtDesc(product.getId());
        assertEquals(2, movementsAfterCancel.size());

        StockMovement inMovement = movementsAfterCancel.get(0); // newest first
        assertEquals(MovementType.STOCK_IN, inMovement.getType());
        assertEquals(5, inMovement.getQuantity());
        assertEquals(15, inMovement.getPreviousStock());
        assertEquals(20, inMovement.getNewStock());
        assertEquals("Cancelled Order #" + createdOrder.getId(), inMovement.getReason());
        assertEquals(product.getId(), inMovement.getProduct().getId());
    }
}
