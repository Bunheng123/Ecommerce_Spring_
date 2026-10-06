package com.setec.stock_inventory.service.impl;

import com.setec.stock_inventory.dto.Request.WholesaleOrderItemRequestDto;
import com.setec.stock_inventory.dto.Request.WholesaleOrderRequestDto;
import com.setec.stock_inventory.dto.Response.WholesaleOrderResponseDto;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.entity.StockMovement;
import com.setec.stock_inventory.entity.User;
import com.setec.stock_inventory.entity.WholesaleBuyer;
import com.setec.stock_inventory.entity.WholesaleOrder;
import com.setec.stock_inventory.entity.WholesaleOrderItem;
import com.setec.stock_inventory.enums.MovementType;
import com.setec.stock_inventory.enums.WholesaleOrderStatus;
import com.setec.stock_inventory.exception.BadRequestException;
import com.setec.stock_inventory.exception.ResourceNotFoundException;
import com.setec.stock_inventory.mapper.WholesaleOrderMapper;
import com.setec.stock_inventory.repo.ProductRepository;
import com.setec.stock_inventory.repo.StockMovementRepository;
import com.setec.stock_inventory.repo.UserRepository;
import com.setec.stock_inventory.repo.WholesaleBuyerRepository;
import com.setec.stock_inventory.repo.WholesaleOrderRepository;
import com.setec.stock_inventory.service.WholesaleOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WholesaleOrderServiceImpl implements WholesaleOrderService {

    private final WholesaleOrderRepository wholesaleOrderRepository;
    private final WholesaleBuyerRepository wholesaleBuyerRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final StockMovementRepository stockMovementRepository;

    @Override
    @Transactional
    public WholesaleOrderResponseDto createWholesaleOrder(WholesaleOrderRequestDto request) {
        WholesaleBuyer buyer = wholesaleBuyerRepository.findById(request.getBuyerId())
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find wholesale buyer with id: " + request.getBuyerId()));

        if (!buyer.isActive()) {
            throw new BadRequestException("Cannot create wholesale order for inactive buyer: " + buyer.getName());
        }

        User user = getCurrentAuthenticatedUser();
        if (user == null) {
            user = userRepository.findByUsername("admin")
                    .or(() -> userRepository.findByUsername("stock"))
                    .orElseThrow(() -> new ResourceNotFoundException("No user found in the system"));
        }

        WholesaleOrder order = WholesaleOrder.builder()
                .buyer(buyer)
                .createdBy(user)
                .status(WholesaleOrderStatus.PENDING)
                .totalAmount(0.0)
                .build();

        double totalAmount = 0.0;
        List<WholesaleOrderItem> orderItems = new ArrayList<>();

        for (WholesaleOrderItemRequestDto itemDto : request.getItems()) {
            Product product = productRepository.findById(itemDto.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cannot find product with id: " + itemDto.getProductId()));

            if (!product.isActive()) {
                throw new BadRequestException("Cannot add inactive product to wholesale order: " + product.getName());
            }

            if (product.getStock() < itemDto.getQuantity()) {
                throw new BadRequestException("Insufficient stock for product '" + product.getName() +
                        "'. Available: " + product.getStock() + ", requested: " + itemDto.getQuantity());
            }

            WholesaleOrderItem item = WholesaleOrderItem.builder()
                    .wholesaleOrder(order)
                    .product(product)
                    .quantity(itemDto.getQuantity())
                    .wholesalePrice(itemDto.getWholesalePrice())
                    .build();

            orderItems.add(item);
            totalAmount += itemDto.getQuantity() * itemDto.getWholesalePrice();
        }

        order.setTotalAmount(totalAmount);
        order.setItems(orderItems);

        WholesaleOrder saved = wholesaleOrderRepository.save(order);
        return WholesaleOrderMapper.toResponse(saved);
    }

    @Override
    public WholesaleOrderResponseDto getWholesaleOrderById(Long id) {
        WholesaleOrder order = wholesaleOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find wholesale order with id: " + id));
        return WholesaleOrderMapper.toResponse(order);
    }

    @Override
    public List<WholesaleOrderResponseDto> getAllWholesaleOrders() {
        return wholesaleOrderRepository.findAllWithDetails().stream()
                .map(WholesaleOrderMapper::toResponse)
                .toList();
    }

    @Override
    public List<WholesaleOrderResponseDto> getWholesaleOrdersByBuyerId(Long buyerId) {
        if (!wholesaleBuyerRepository.existsById(buyerId)) {
            throw new ResourceNotFoundException("Cannot find wholesale buyer with id: " + buyerId);
        }
        return wholesaleOrderRepository.findByBuyerIdWithDetails(buyerId).stream()
                .map(WholesaleOrderMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public WholesaleOrderResponseDto completeWholesaleOrder(Long id) {
        WholesaleOrder order = wholesaleOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find wholesale order with id: " + id));

        if (order.getStatus() != WholesaleOrderStatus.PENDING) {
            throw new BadRequestException("Cannot complete wholesale order with status: " + order.getStatus()
                    + ". Only PENDING wholesale orders can be completed.");
        }

        User currentUser = getCurrentAuthenticatedUser();

        // Verify stock sufficiency before deducting
        for (WholesaleOrderItem item : order.getItems()) {
            Product product = item.getProduct();
            if (product.getStock() < item.getQuantity()) {
                throw new BadRequestException("Insufficient stock to complete wholesale order for product '" +
                        product.getName() + "'. Available: " + product.getStock() + ", requested: " + item.getQuantity());
            }
        }

        // Deduct stock and log stock movement
        for (WholesaleOrderItem item : order.getItems()) {
            Product product = item.getProduct();
            int previousStock = product.getStock();
            int newStock = previousStock - item.getQuantity();
            product.setStock(newStock);
            productRepository.save(product);

            StockMovement movement = StockMovement.builder()
                    .product(product)
                    .type(MovementType.STOCK_OUT)
                    .quantity(item.getQuantity())
                    .previousStock(previousStock)
                    .newStock(newStock)
                    .reason("Wholesale Order #" + order.getId())
                    .user(currentUser)
                    .build();

            stockMovementRepository.save(movement);
        }

        order.setStatus(WholesaleOrderStatus.COMPLETED);
        WholesaleOrder updated = wholesaleOrderRepository.save(order);
        return WholesaleOrderMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public WholesaleOrderResponseDto cancelWholesaleOrder(Long id) {
        WholesaleOrder order = wholesaleOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find wholesale order with id: " + id));

        if (order.getStatus() != WholesaleOrderStatus.PENDING) {
            throw new BadRequestException("Cannot cancel wholesale order with status: " + order.getStatus()
                    + ". Only PENDING wholesale orders can be cancelled.");
        }

        order.setStatus(WholesaleOrderStatus.CANCELLED);
        WholesaleOrder updated = wholesaleOrderRepository.save(order);
        return WholesaleOrderMapper.toResponse(updated);
    }

    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !(authentication instanceof AnonymousAuthenticationToken)) {
            String username = authentication.getName();
            return userRepository.findByUsername(username).orElse(null);
        }
        return null;
    }
}
