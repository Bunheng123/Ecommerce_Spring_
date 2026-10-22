package com.setec.stock_inventory.service.impl;

import com.setec.stock_inventory.dto.Request.CheckoutRequestDto;
import com.setec.stock_inventory.dto.Request.OrderItemRequestDto;
import com.setec.stock_inventory.dto.Request.OrderRequestDto;
import com.setec.stock_inventory.dto.Response.OrderResponseDto;
import com.setec.stock_inventory.entity.Cart;
import com.setec.stock_inventory.entity.CartItem;
import com.setec.stock_inventory.entity.Order;
import com.setec.stock_inventory.entity.OrderItem;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.entity.StockMovement;
import com.setec.stock_inventory.entity.User;
import com.setec.stock_inventory.enums.MovementType;
import com.setec.stock_inventory.enums.PaymentStatus;
import com.setec.stock_inventory.enums.Role;
import com.setec.stock_inventory.exception.BadRequestException;
import com.setec.stock_inventory.exception.ResourceNotFoundException;
import com.setec.stock_inventory.mapper.OrderMapper;
import com.setec.stock_inventory.repo.CartRepository;
import com.setec.stock_inventory.repo.OrderItemRepository;
import com.setec.stock_inventory.repo.OrderRepository;
import com.setec.stock_inventory.repo.ProductRepository;
import com.setec.stock_inventory.repo.StockMovementRepository;
import com.setec.stock_inventory.dto.email.OrderEmailItemDto;
import com.setec.stock_inventory.dto.email.OrderEmailPayload;
import com.setec.stock_inventory.dto.email.StockAlertEmailPayload;
import com.setec.stock_inventory.repo.UserRepository;
import com.setec.stock_inventory.service.EmailService;
import com.setec.stock_inventory.service.OrderService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final StockMovementRepository stockMovementRepository;
    private final CartRepository cartRepository;
    private final EmailService emailService;
    private final com.setec.stock_inventory.service.StockBatchService stockBatchService;

    @Autowired
    public OrderServiceImpl(
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            ProductRepository productRepository,
            UserRepository userRepository,
            StockMovementRepository stockMovementRepository,
            CartRepository cartRepository,
            EmailService emailService,
            com.setec.stock_inventory.service.StockBatchService stockBatchService
    ) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.cartRepository = cartRepository;
        this.emailService = emailService;
        this.stockBatchService = stockBatchService;
    }

    @Override
    @Transactional
    public OrderResponseDto createOrder(OrderRequestDto request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find user with id: " + request.getUserId()));

        User currentUser = getCurrentAuthenticatedUser();

        Order order = Order.builder()
                .user(user)
                .orderDate(LocalDateTime.now())
                .status("PENDING")
                .paymentStatus(PaymentStatus.UNPAID)
                .build();

        List<OrderItemInput> itemInputs = new ArrayList<>();
        for (OrderItemRequestDto itemDto : request.getOrderItemList()) {
            Product product = productRepository.findById(itemDto.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cannot find product with id: " + itemDto.getProductId()));
            itemInputs.add(new OrderItemInput(product, itemDto.getQuantity(), product.getPrice()));
        }

        Order saved = processOrderCreation(order, itemInputs, currentUser);
        return OrderMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public OrderResponseDto checkoutCart(CheckoutRequestDto request) {
        User currentUser = getRequiredAuthenticatedUser();
        Cart cart = cartRepository.findByUserIdWithItems(currentUser.getId())
                .orElseThrow(() -> new BadRequestException("Cannot checkout: Cart not found"));

        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new BadRequestException("Cannot checkout: Cart is empty");
        }

        List<OrderItemInput> itemInputs = new ArrayList<>();
        for (CartItem cartItem : cart.getItems()) {
            Product product = productRepository.findById(cartItem.getProduct().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cannot find product with id: " + cartItem.getProduct().getId()));
            itemInputs.add(new OrderItemInput(product, cartItem.getQuantity(), product.getPrice()));
        }

        Order order = Order.builder()
                .user(currentUser)
                .shippingAddress(request.getShippingAddress())
                .customerNote(request.getCustomerNote())
                .paymentMethod(request.getPaymentMethod())
                .paymentStatus(PaymentStatus.UNPAID)
                .status("PENDING")
                .orderDate(LocalDateTime.now())
                .build();

        String method = request.getPaymentMethod() != null ? request.getPaymentMethod().name().toUpperCase() : "";

        if (method.contains("QR") || method.contains("BANK") || method.contains("KHQR") || method.contains("CARD")) {
            order.setPaymentStatus(PaymentStatus.PAID);
        } else {
            order.setPaymentStatus(PaymentStatus.UNPAID);
        }

        Order saved = processOrderCreation(order, itemInputs, currentUser);

        // Clear cart after successful checkout
        cart.getItems().clear();
        cartRepository.save(cart);

        return OrderMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public OrderResponseDto getOrderById(Long id) {
        Order order = orderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id " + id));

        checkAndAutoCompleteOrder(order);

        User currentUser = getCurrentAuthenticatedUser();
        if (currentUser != null && currentUser.getRole() == Role.USER) {
            if (!order.getUser().getId().equals(currentUser.getId())) {
                throw new AccessDeniedException("You do not have permission to view this order");
            }
        }

        return OrderMapper.toResponse(order);
    }

    @Override
    @Transactional
    public List<OrderResponseDto> getAllOrders() {
        autoCompleteExpiredPendingOrders();
        return orderRepository.findAllWithDetails().stream()
                .map(OrderMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public List<OrderResponseDto> getOrdersByUserId(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("Cannot find user with id: " + userId);
        }
        autoCompleteExpiredPendingOrders();
        return orderRepository.findByUserIdWithDetails(userId).stream()
                .map(OrderMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public List<OrderResponseDto> getMyOrders() {
        User currentUser = getRequiredAuthenticatedUser();
        autoCompleteExpiredPendingOrders();
        return orderRepository.findByUserIdWithDetails(currentUser.getId()).stream()
                .map(OrderMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 60000)
    public void autoCompleteExpiredPendingOrders() {
        List<Order> pendingOrders = orderRepository.findByStatusIgnoreCase("PENDING");
        LocalDateTime now = LocalDateTime.now();
        for (Order order : pendingOrders) {
            if (order.getOrderDate() != null && Duration.between(order.getOrderDate(), now).toHours() >= 48) {
                Order fullOrder = orderRepository.findByIdWithDetails(order.getId()).orElse(order);
                fullOrder.setStatus("COMPLETED");
                fullOrder.setPaymentStatus(PaymentStatus.PAID);
                Order saved = orderRepository.save(fullOrder);

                try {
                    OrderEmailPayload payload = buildOrderEmailPayload(saved);
                    if (payload != null) {
                        emailService.sendOrderCompletedEmail(payload);
                    }
                } catch (Exception e) {
                    log.error("Failed to trigger auto-complete email for Order #{}: {}", saved.getId(), e.getMessage());
                }
            }
        }
    }

    private void checkAndAutoCompleteOrder(Order order) {
        if (order != null && "PENDING".equalsIgnoreCase(order.getStatus()) && order.getOrderDate() != null) {
            long hoursElapsed = Duration.between(order.getOrderDate(), LocalDateTime.now()).toHours();
            if (hoursElapsed >= 48) {
                order.setStatus("COMPLETED");
                order.setPaymentStatus(PaymentStatus.PAID);
                Order saved = orderRepository.save(order);

                try {
                    OrderEmailPayload payload = buildOrderEmailPayload(saved);
                    if (payload != null) {
                        emailService.sendOrderCompletedEmail(payload);
                    }
                } catch (Exception e) {
                    log.error("Failed to trigger checkAndAutoComplete email for Order #{}: {}", saved.getId(), e.getMessage());
                }
            }
        }
    }

    @Override
    @Transactional
    public OrderResponseDto updateStatus(Long id, String status) {
        Order order = orderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id " + id));

        String currentStatus = order.getStatus() != null ? order.getStatus().trim().toUpperCase() : "";
        if ("CANCELLED".equals(currentStatus) || "COMPLETED".equals(currentStatus)) {
            throw new BadRequestException("This order is " + currentStatus.toLowerCase() + " and can no longer be modified");
        }

        String newStatus = status.trim().toUpperCase();
        boolean wasPending = "PENDING".equalsIgnoreCase(currentStatus);
        boolean isNowCompleted = "COMPLETED".equalsIgnoreCase(newStatus);
        boolean isNowCancelled = "CANCELLED".equalsIgnoreCase(newStatus);

        User currentUser = getCurrentAuthenticatedUser();

        // If cancelling order, restore stock and adjust payment status if PAID within 2h
        if (isNowCancelled) {
            restoreStockAndLogMovements(order, currentUser);
        } else {
            order.setStatus(newStatus);
            if (isNowCompleted) {
                order.setPaymentStatus(PaymentStatus.PAID);
            }
        }

        Order updated = orderRepository.save(order);

        if (wasPending && isNowCompleted) {
            try {
                OrderEmailPayload payload = buildOrderEmailPayload(updated);
                if (payload != null) {
                    emailService.sendOrderCompletedEmail(payload);
                }
            } catch (Exception e) {
                log.error("Failed to trigger order completed email for Order #{}: {}", updated.getId(), e.getMessage());
            }
        } else if (isNowCancelled) {
            try {
                OrderEmailPayload payload = buildOrderEmailPayload(updated);
                if (payload != null) {
                    boolean refundStatus = updated.getPaymentStatus() == PaymentStatus.REFUNDED;
                    BigDecimal refundAmt = refundStatus
                            ? (payload.getTotalAmount() != null ? payload.getTotalAmount() : BigDecimal.ZERO)
                            : BigDecimal.ZERO;
                    payload.setRefunded(refundStatus);
                    payload.setRefundAmount(refundAmt);
                    emailService.sendOrderCancelledEmail(payload, refundStatus);
                    emailService.sendAdminOrderCancelledAlertEmail(payload, refundStatus, "Admin");
                }
            } catch (Exception e) {
                log.error("Failed to trigger order cancelled email for Order #{}: {}", updated.getId(), e.getMessage());
            }
        }

        return OrderMapper.toResponse(updated);
    }

    private OrderEmailPayload buildOrderEmailPayload(Order order) {
        if (order == null || order.getUser() == null) {
            return null;
        }

        List<OrderEmailItemDto> items = new ArrayList<>();
        if (order.getOrderItems() != null) {
            for (OrderItem oi : order.getOrderItems()) {
                String pName = "Product";
                String imgUrl = null;
                if (oi.getProduct() != null) {
                    pName = oi.getProduct().getName() != null ? oi.getProduct().getName() : "Product";
                    imgUrl = oi.getProduct().getImageUrl();
                }
                BigDecimal price = BigDecimal.valueOf(oi.getPrice());
                BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(oi.getQuantity()));
                items.add(OrderEmailItemDto.builder()
                        .productName(pName)
                        .quantity(oi.getQuantity())
                        .price(price)
                        .lineTotal(lineTotal)
                        .imageUrl(imgUrl)
                        .build());
            }
        }

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm");
        String formattedDate = order.getOrderDate() != null ? order.getOrderDate().format(formatter) : "";

        String phone = order.getUser().getPhone() != null ? order.getUser().getPhone() : "";

        return OrderEmailPayload.builder()
                .orderId(order.getId())
                .recipientEmail(order.getUser().getEmail())
                .customerName(order.getUser().getFullName())
                .username(order.getUser().getUsername())
                .phone(phone)
                .shippingAddress(order.getShippingAddress())
                .paymentMethod(order.getPaymentMethod() != null ? order.getPaymentMethod().name() : "N/A")
                .subtotal(order.getSubtotal() != null ? order.getSubtotal() : BigDecimal.ZERO)
                .shippingCost(order.getShippingCost() != null ? order.getShippingCost() : BigDecimal.ZERO)
                .taxAmount(order.getTaxAmount() != null ? order.getTaxAmount() : BigDecimal.ZERO)
                .totalAmount(order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO)
                .orderDate(formattedDate)
                .paymentStatus(order.getPaymentStatus() != null ? order.getPaymentStatus().name() : "UNPAID")
                .items(items)
                .build();
    }

    @Override
    @Transactional
    public OrderResponseDto selfCancelOrder(Long id) {
        User currentUser = getRequiredAuthenticatedUser();
        Order order = orderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id " + id));

        if (!order.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You do not have permission to cancel this order");
        }

        String currentStatus = order.getStatus() != null ? order.getStatus().trim().toUpperCase() : "";
        if ("CANCELLED".equals(currentStatus) || "COMPLETED".equals(currentStatus)) {
            throw new BadRequestException("This order is " + currentStatus.toLowerCase() + " and can no longer be modified");
        }

        if (order.getOrderDate() != null) {
            long minutesElapsed = Duration.between(order.getOrderDate(), LocalDateTime.now()).toMinutes();
            if (minutesElapsed > 120) {
                throw new BadRequestException("Orders can only be cancelled within 2 hours of placing them");
            }
        }

        restoreStockAndLogMovements(order, currentUser);
        Order updated = orderRepository.save(order);

        try {
            OrderEmailPayload payload = buildOrderEmailPayload(updated);
            if (payload != null) {
                boolean refundStatus = updated.getPaymentStatus() == PaymentStatus.REFUNDED;
                BigDecimal refundAmt = refundStatus
                        ? (payload.getTotalAmount() != null ? payload.getTotalAmount() : BigDecimal.ZERO)
                        : BigDecimal.ZERO;
                payload.setRefunded(refundStatus);
                payload.setRefundAmount(refundAmt);
                emailService.sendOrderCancelledEmail(payload, refundStatus);
                emailService.sendAdminOrderCancelledAlertEmail(payload, refundStatus, "Customer Self-Cancel");
            }
        } catch (Exception e) {
            log.error("Failed to trigger order cancelled email for self-cancelled Order #{}: {}", updated.getId(), e.getMessage());
        }

        return OrderMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public OrderResponseDto updatePaymentStatus(Long id, PaymentStatus status) {
        Order order = orderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id " + id));

        String currentStatus = order.getStatus() != null ? order.getStatus().trim().toUpperCase() : "";
        if ("CANCELLED".equals(currentStatus) || "COMPLETED".equals(currentStatus)) {
            throw new BadRequestException("This order is " + currentStatus.toLowerCase() + " and can no longer be modified");
        }

        order.setPaymentStatus(status);
        Order updated = orderRepository.save(order);
        return OrderMapper.toResponse(updated);
    }

    // --- Shared Helper Methods ---

    private static class OrderItemInput {
        private final Product product;
        private final int quantity;
        private final double price;

        public OrderItemInput(Product product, int quantity, double price) {
            this.product = product;
            this.quantity = quantity;
            this.price = price;
        }
    }

    private Order processOrderCreation(Order order, List<OrderItemInput> itemInputs, User currentUser) {
        // 1. Re-validate active status and stock for all items first
        for (OrderItemInput input : itemInputs) {
            Product p = input.product;
            if (!p.isActive()) {
                throw new BadRequestException("Cannot order deactivated product: " + p.getName());
            }
            if (p.getStock() <= 0) {
                throw new BadRequestException("This product is coming soon and cannot be ordered until stock arrives.");
            }
            if (p.getStock() < input.quantity) {
                throw new BadRequestException("Insufficient stock for product: " + p.getName()
                        + ". Available: " + p.getStock() + ", Requested: " + input.quantity);
            }
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();
        List<StockMovement> stockMovements = new ArrayList<>();
        List<StockAlertEmailPayload> stockAlerts = new ArrayList<>();

        for (OrderItemInput input : itemInputs) {
            Product product = input.product;
            int previousStock = product.getStock();
            int newStock = previousStock - input.quantity;
            product.setStock(newStock);
            Product savedProduct = productRepository.save(product);
            BigDecimal itemCogs = stockBatchService.depleteStockFifo(savedProduct, input.quantity);
            BigDecimal itemUnitCost = input.quantity > 0
                    ? itemCogs.divide(BigDecimal.valueOf(input.quantity), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

            if (newStock <= savedProduct.getReorderLevel()) {
                String brandName = savedProduct.getBrand() != null ? savedProduct.getBrand().getName() : "N/A";
                String categoryName = savedProduct.getCategory() != null ? savedProduct.getCategory().getName() : "N/A";
                stockAlerts.add(StockAlertEmailPayload.builder()
                        .productId(savedProduct.getId())
                        .productName(savedProduct.getName())
                        .brandName(brandName)
                        .categoryName(categoryName)
                        .previousStock(previousStock)
                        .currentStock(newStock)
                        .reorderLevel(savedProduct.getReorderLevel())
                        .build());
            }

            BigDecimal unitPrice = BigDecimal.valueOf(input.price).setScale(2, RoundingMode.HALF_UP);
            BigDecimal itemTotal = unitPrice.multiply(BigDecimal.valueOf(input.quantity));

            OrderItem orderItem = new OrderItem();
            orderItem.setProduct(savedProduct);
            orderItem.setQuantity(input.quantity);
            orderItem.setPrice(input.price);
            orderItem.setUnitCost(itemUnitCost);
            orderItem.setTotalCogs(itemCogs);
            orderItem.setOrder(order);

            orderItems.add(orderItem);
            subtotal = subtotal.add(itemTotal);

            stockMovements.add(StockMovement.builder()
                    .product(savedProduct)
                    .type(MovementType.STOCK_OUT)
                    .quantity(input.quantity)
                    .previousStock(previousStock)
                    .newStock(newStock)
                    .user(currentUser)
                    .build());
        }

        subtotal = subtotal.setScale(2, RoundingMode.HALF_UP);
        BigDecimal taxAmount = subtotal.multiply(new BigDecimal("0.10")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal shippingCost = subtotal.compareTo(new BigDecimal("100.00")) >= 0
                ? new BigDecimal("0.00")
                : new BigDecimal("5.00");
        BigDecimal totalAmount = subtotal.add(taxAmount).add(shippingCost);

        order.setSubtotal(subtotal);
        order.setShippingCost(shippingCost);
        order.setTaxAmount(taxAmount);
        order.setTotalAmount(totalAmount);
        order.setOrderItems(orderItems);

        Order saved = orderRepository.save(order);

        for (StockMovement movement : stockMovements) {
            movement.setReason("Order #" + saved.getId());
            stockMovementRepository.save(movement);
        }

        for (StockAlertEmailPayload alert : stockAlerts) {
            alert.setTriggerSource("Customer Order #" + saved.getId());
            try {
                emailService.sendAdminStockAlertEmail(alert);
            } catch (Exception e) {
                log.error("Failed to trigger admin stock alert for Product #{}: {}", alert.getProductId(), e.getMessage());
            }
        }

        return saved;
    }

    private void restoreStockAndLogMovements(Order order, User currentUser) {
        if ("CANCELLED".equals(order.getStatus())) {
            return;
        }

        if (order.getOrderItems() != null) {
            for (OrderItem item : order.getOrderItems()) {
                Product product = item.getProduct();
                int previousStock = product.getStock();
                int newStock = previousStock + item.getQuantity();
                product.setStock(newStock);
                productRepository.save(product);
                stockBatchService.restoreStock(product, item.getQuantity());

                StockMovement movement = StockMovement.builder()
                        .product(product)
                        .type(MovementType.STOCK_IN)
                        .quantity(item.getQuantity())
                        .previousStock(previousStock)
                        .newStock(newStock)
                        .reason("Cancelled Order #" + order.getId())
                        .user(currentUser)
                        .build();

                stockMovementRepository.save(movement);
            }
        }

        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            boolean withinTwoHours = false;
            if (order.getOrderDate() != null) {
                long minutesElapsed = Duration.between(order.getOrderDate(), LocalDateTime.now()).toMinutes();
                withinTwoHours = minutesElapsed <= 120;
            }
            if (withinTwoHours) {
                order.setPaymentStatus(PaymentStatus.REFUNDED);
            }
        }

        order.setStatus("CANCELLED");
    }

    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !(authentication instanceof AnonymousAuthenticationToken)) {
            String username = authentication.getName();
            return userRepository.findByUsername(username).orElse(null);
        }
        return null;
    }

    private User getRequiredAuthenticatedUser() {
        User currentUser = getCurrentAuthenticatedUser();
        if (currentUser == null) {
            throw new BadRequestException("No authenticated user found in security context");
        }
        return currentUser;
    }
}