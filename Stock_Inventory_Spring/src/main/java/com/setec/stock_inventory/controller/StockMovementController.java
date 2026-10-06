package com.setec.stock_inventory.controller;

import com.setec.stock_inventory.dto.ApiResponse;
import com.setec.stock_inventory.dto.Response.StockMovementResponseDto;
import com.setec.stock_inventory.entity.StockMovement;
import com.setec.stock_inventory.repo.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/stock-movements")
@RequiredArgsConstructor
public class StockMovementController {

    private final StockMovementRepository stockMovementRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STOCK')")
    public ResponseEntity<ApiResponse<List<StockMovementResponseDto>>> getAllStockMovements() {
        List<StockMovementResponseDto> movements = stockMovementRepository.findAll().stream()
                .sorted(Comparator.comparing(StockMovement::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(ApiResponse.success("Stock movements retrieved successfully", movements));
    }

    private StockMovementResponseDto toResponse(StockMovement movement) {
        return StockMovementResponseDto.builder()
                .id(movement.getId())
                .productId(movement.getProduct() != null ? movement.getProduct().getId() : null)
                .productName(movement.getProduct() != null ? movement.getProduct().getName() : null)
                .type(movement.getType())
                .quantity(movement.getQuantity())
                .previousStock(movement.getPreviousStock())
                .newStock(movement.getNewStock())
                .reason(movement.getReason())
                .userId(movement.getUser() != null ? movement.getUser().getId() : null)
                .userName(movement.getUser() != null ? movement.getUser().getUsername() : "System")
                .createdAt(movement.getCreatedAt())
                .build();
    }
}
