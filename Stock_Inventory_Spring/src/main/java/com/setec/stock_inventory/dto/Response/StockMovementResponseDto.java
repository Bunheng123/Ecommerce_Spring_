package com.setec.stock_inventory.dto.Response;

import com.setec.stock_inventory.enums.MovementType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockMovementResponseDto {
    private Long id;
    private Long productId;
    private String productName;
    private MovementType type;
    private int quantity;
    private int previousStock;
    private int newStock;
    private String reason;
    private Long userId;
    private String userName;
    private LocalDateTime createdAt;
}
