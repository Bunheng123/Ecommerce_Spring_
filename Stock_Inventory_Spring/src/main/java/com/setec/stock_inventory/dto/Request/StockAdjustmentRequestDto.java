package com.setec.stock_inventory.dto.Request;

import com.setec.stock_inventory.enums.MovementType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockAdjustmentRequestDto {

    @NotNull(message = "Quantity is required")
    private Integer quantity;

    @NotBlank(message = "Reason is required")
    private String reason;

    private MovementType type;
}
