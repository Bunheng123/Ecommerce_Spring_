package com.setec.stock_inventory;

import com.setec.stock_inventory.dto.Request.OrderItemRequestDto;
import com.setec.stock_inventory.dto.Request.OrderRequestDto;
import com.setec.stock_inventory.dto.Request.ProductRequestDto;
import com.setec.stock_inventory.dto.Response.OrderResponseDto;
import com.setec.stock_inventory.entity.Category;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.entity.User;
import com.setec.stock_inventory.enums.Role;
import com.setec.stock_inventory.exception.BadRequestException;
import com.setec.stock_inventory.repo.CategoryRepository;
import com.setec.stock_inventory.repo.ProductRepository;
import com.setec.stock_inventory.repo.UserRepository;
import com.setec.stock_inventory.service.OrderService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class ProductValidationTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private Validator validator;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private User testUser;
    private Category testCategory;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("ALTER TABLE products DROP CONSTRAINT IF EXISTS products_stock_check;");
        jdbcTemplate.execute("ALTER TABLE products ADD CONSTRAINT products_stock_check CHECK (stock >= 0);");

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        testUser = userRepository.save(User.builder()
                .username("val_user_" + suffix)
                .email("val_user_" + suffix + "@test.com")
                .password("password")
                .role(Role.STOCK)
                .build());

        testCategory = categoryRepository.save(Category.builder()
                .name("Cat_" + suffix)
                .description("Test Category")
                .build());
    }

    @Test
    void testOrderReducesStockToOneAndThenZeroSuccessfully() {
        // Create product with stock = 1
        Product product = productRepository.save(Product.builder()
                .name("Product_Stock_1_" + UUID.randomUUID().toString().substring(0, 8))
                .price(15.0)
                .stock(1)
                .category(testCategory)
                .build());

        assertEquals(1, product.getStock());

        // Place an order for quantity = 1
        OrderItemRequestDto item = new OrderItemRequestDto();
        item.setProductId(product.getId());
        item.setQuantity(1);

        OrderRequestDto orderRequest = new OrderRequestDto();
        orderRequest.setUserId(testUser.getId());
        orderRequest.setOrderItemList(List.of(item));

        OrderResponseDto orderResponse = orderService.createOrder(orderRequest);
        assertNotNull(orderResponse);

        // Confirm stock becomes 0 successfully with no validation error
        Product updatedProduct = productRepository.findById(product.getId()).orElseThrow();
        assertEquals(0, updatedProduct.getStock());
    }

    @Test
    void testOrderMoreThanAvailableStockRejectedWithClearMessage() {
        // Create product with stock = 2
        Product product = productRepository.save(Product.builder()
                .name("Product_Stock_2_" + UUID.randomUUID().toString().substring(0, 8))
                .price(10.0)
                .stock(2)
                .category(testCategory)
                .build());

        // Try to order 3
        OrderItemRequestDto item = new OrderItemRequestDto();
        item.setProductId(product.getId());
        item.setQuantity(3);

        OrderRequestDto orderRequest = new OrderRequestDto();
        orderRequest.setUserId(testUser.getId());
        orderRequest.setOrderItemList(List.of(item));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> {
            orderService.createOrder(orderRequest);
        });

        assertTrue(ex.getMessage().contains("Insufficient stock for product: " + product.getName()),
                "Expected insufficient stock message but got: " + ex.getMessage());
    }

    @Test
    void testManualUpdateStockToNegativeOneRejected() {
        // 1. Test DTO validation rejects stock = -1
        ProductRequestDto requestDto = ProductRequestDto.builder()
                .name("Negative Stock Product")
                .price(10.0)
                .stock(-1)
                .categoryId(testCategory.getId())
                .build();

        Set<ConstraintViolation<ProductRequestDto>> dtoViolations = validator.validate(requestDto);
        assertFalse(dtoViolations.isEmpty());
        assertTrue(dtoViolations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("stock")),
                "Expected validation error on stock field for DTO");

        // 2. Test Entity validation rejects stock = -1
        Product product = Product.builder()
                .name("Negative Product")
                .price(10.0)
                .stock(-1)
                .category(testCategory)
                .build();

        Set<ConstraintViolation<Product>> entityViolations = validator.validate(product);
        assertFalse(entityViolations.isEmpty());
        assertTrue(entityViolations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("stock")),
                "Expected validation error on stock field for Entity");

        assertThrows(ConstraintViolationException.class, () -> {
            productRepository.saveAndFlush(product);
        });
    }

    @Test
    void testManualUpdateStockToZeroAccepted() {
        // Test DTO validation accepts stock = 0
        ProductRequestDto requestDto = ProductRequestDto.builder()
                .name("Zero Stock Product")
                .price(10.0)
                .stock(0)
                .categoryId(testCategory.getId())
                .build();

        Set<ConstraintViolation<ProductRequestDto>> dtoViolations = validator.validate(requestDto);
        assertTrue(dtoViolations.isEmpty(), "DTO validation should pass for stock = 0");

        // Test Entity validation accepts stock = 0
        Product product = Product.builder()
                .name("Zero Stock Entity " + UUID.randomUUID().toString().substring(0, 8))
                .price(10.0)
                .stock(0)
                .category(testCategory)
                .build();

        Set<ConstraintViolation<Product>> entityViolations = validator.validate(product);
        assertTrue(entityViolations.isEmpty(), "Entity validation should pass for stock = 0");

        Product saved = productRepository.saveAndFlush(product);
        assertEquals(0, saved.getStock());
    }
}
