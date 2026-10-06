package com.setec.stock_inventory.service.impl;

import com.setec.stock_inventory.dto.Request.PurchaseOrderItemRequestDto;
import com.setec.stock_inventory.dto.Request.PurchaseOrderRequestDto;
import com.setec.stock_inventory.dto.Response.PurchaseOrderResponseDto;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.entity.PurchaseOrder;
import com.setec.stock_inventory.entity.PurchaseOrderItem;
import com.setec.stock_inventory.entity.StockMovement;
import com.setec.stock_inventory.entity.Supplier;
import com.setec.stock_inventory.entity.User;
import com.setec.stock_inventory.enums.MovementType;
import com.setec.stock_inventory.enums.PurchaseOrderStatus;
import com.setec.stock_inventory.exception.BadRequestException;
import com.setec.stock_inventory.exception.ResourceNotFoundException;
import com.setec.stock_inventory.mapper.PurchaseOrderMapper;
import com.setec.stock_inventory.repo.ProductRepository;
import com.setec.stock_inventory.repo.PurchaseOrderRepository;
import com.setec.stock_inventory.repo.StockMovementRepository;
import com.setec.stock_inventory.repo.SupplierRepository;
import com.setec.stock_inventory.repo.UserRepository;
import com.setec.stock_inventory.service.PurchaseOrderService;
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
public class PurchaseOrderServiceImpl implements PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final StockMovementRepository stockMovementRepository;

    @Override
    @Transactional
    public PurchaseOrderResponseDto createPurchaseOrder(PurchaseOrderRequestDto request) {
        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find supplier with id: " + request.getSupplierId()));

        if (!supplier.isActive()) {
            throw new BadRequestException("Cannot create purchase order for inactive supplier: " + supplier.getName());
        }

        User user = getCurrentAuthenticatedUser();
        if (user == null) {
            user = userRepository.findByUsername("admin")
                    .or(() -> userRepository.findByUsername("stock"))
                    .orElseThrow(() -> new ResourceNotFoundException("No user found in the system"));
        }

        PurchaseOrder order = PurchaseOrder.builder()
                .supplier(supplier)
                .createdBy(user)
                .status(PurchaseOrderStatus.PENDING)
                .totalCost(0.0)
                .build();

        double totalCost = 0.0;
        List<PurchaseOrderItem> orderItems = new ArrayList<>();

        for (PurchaseOrderItemRequestDto itemDto : request.getItems()) {
            Product product = productRepository.findById(itemDto.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cannot find product with id: " + itemDto.getProductId()));

            PurchaseOrderItem item = PurchaseOrderItem.builder()
                    .purchaseOrder(order)
                    .product(product)
                    .quantity(itemDto.getQuantity())
                    .costPrice(itemDto.getCostPrice())
                    .build();

            orderItems.add(item);
            totalCost += itemDto.getQuantity() * itemDto.getCostPrice();
        }

        order.setTotalCost(totalCost);
        order.setItems(orderItems);

        PurchaseOrder saved = purchaseOrderRepository.save(order);
        return PurchaseOrderMapper.toResponse(saved);
    }

    @Override
    public PurchaseOrderResponseDto getPurchaseOrderById(Long id) {
        PurchaseOrder order = purchaseOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find purchase order with id: " + id));
        return PurchaseOrderMapper.toResponse(order);
    }

    @Override
    public List<PurchaseOrderResponseDto> getAllPurchaseOrders() {
        return purchaseOrderRepository.findAllWithDetails().stream()
                .map(PurchaseOrderMapper::toResponse)
                .toList();
    }

    @Override
    public List<PurchaseOrderResponseDto> getPurchaseOrdersBySupplierId(Long supplierId) {
        if (!supplierRepository.existsById(supplierId)) {
            throw new ResourceNotFoundException("Cannot find supplier with id: " + supplierId);
        }
        return purchaseOrderRepository.findBySupplierIdWithDetails(supplierId).stream()
                .map(PurchaseOrderMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public PurchaseOrderResponseDto receivePurchaseOrder(Long id) {
        PurchaseOrder order = purchaseOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find purchase order with id: " + id));

        if (order.getStatus() != PurchaseOrderStatus.PENDING) {
            throw new BadRequestException("Cannot receive purchase order with status: " + order.getStatus()
                    + ". Only PENDING purchase orders can be received.");
        }

        User currentUser = getCurrentAuthenticatedUser();

        for (PurchaseOrderItem item : order.getItems()) {
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
                    .reason("Purchase Order #" + order.getId())
                    .user(currentUser)
                    .build();

            stockMovementRepository.save(movement);
        }

        order.setStatus(PurchaseOrderStatus.RECEIVED);
        PurchaseOrder updated = purchaseOrderRepository.save(order);
        return PurchaseOrderMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public PurchaseOrderResponseDto cancelPurchaseOrder(Long id) {
        PurchaseOrder order = purchaseOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find purchase order with id: " + id));

        if (order.getStatus() != PurchaseOrderStatus.PENDING) {
            throw new BadRequestException("Cannot cancel purchase order with status: " + order.getStatus()
                    + ". Only PENDING purchase orders can be cancelled.");
        }

        order.setStatus(PurchaseOrderStatus.CANCELLED);
        PurchaseOrder updated = purchaseOrderRepository.save(order);
        return PurchaseOrderMapper.toResponse(updated);
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
