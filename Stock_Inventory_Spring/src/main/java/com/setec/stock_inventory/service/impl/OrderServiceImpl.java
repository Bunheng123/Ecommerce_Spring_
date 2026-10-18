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
import com.setec.stock_inventory.repo.UserRepository;
import com.setec.stock_inventory.service.OrderService;
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
import java.util.ArrayList;
import java.util.List;

@Service
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final StockMovementRepository stockMovementRepository;
    private final CartRepository cartRepository;

    @Autowired
    public OrderServiceImpl(
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            ProductRepository productRepository,
            UserRepository userRepository,
            StockMovementRepository stockMovementRepository,
            CartRepository cartRepository
    ) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.cartRepository = cartRepository;
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
                order.setStatus("COMPLETED");
                order.setPaymentStatus(PaymentStatus.PAID);
                orderRepository.save(order);
            }
        }
    }

    private void checkAndAutoCompleteOrder(Order order) {
        if (order != null && "PENDING".equalsIgnoreCase(order.getStatus()) && order.getOrderDate() != null) {
            long hoursElapsed = Duration.between(order.getOrderDate(), LocalDateTime.now()).toHours();
            if (hoursElapsed >= 48) {
                order.setStatus("COMPLETED");
                order.setPaymentStatus(PaymentStatus.PAID);
                orderRepository.save(order);
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

        User currentUser = getCurrentAuthenticatedUser();

        // If cancelling order, restore stock and adjust payment status if PAID within 2h
        if ("CANCELLED".equals(newStatus)) {
            restoreStockAndLogMovements(order, currentUser);
        } else {
            order.setStatus(newStatus);
            if ("COMPLETED".equals(newStatus)) {
                order.setPaymentStatus(PaymentStatus.PAID);
            }
        }

        Order updated = orderRepository.save(order);
        return OrderMapper.toResponse(updated);
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
            if (p.getStock() < input.quantity) {
                throw new BadRequestException("Insufficient stock for product: " + p.getName()
                        + ". Available: " + p.getStock() + ", Requested: " + input.quantity);
            }
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();
        List<StockMovement> stockMovements = new ArrayList<>();

        for (OrderItemInput input : itemInputs) {
            Product product = input.product;
            int previousStock = product.getStock();
            int newStock = previousStock - input.quantity;
            product.setStock(newStock);
            productRepository.save(product);

            BigDecimal unitPrice = BigDecimal.valueOf(input.price).setScale(2, RoundingMode.HALF_UP);
            BigDecimal itemTotal = unitPrice.multiply(BigDecimal.valueOf(input.quantity));

            OrderItem orderItem = new OrderItem();
            orderItem.setProduct(product);
            orderItem.setQuantity(input.quantity);
            orderItem.setPrice(input.price);
            orderItem.setOrder(order);

            orderItems.add(orderItem);
            subtotal = subtotal.add(itemTotal);

            stockMovements.add(StockMovement.builder()
                    .product(product)
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