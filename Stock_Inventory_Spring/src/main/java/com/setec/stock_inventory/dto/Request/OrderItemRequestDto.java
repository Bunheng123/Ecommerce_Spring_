package com.setec.stock_inventory.dto.Request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class OrderItemRequestDto {

    @NotNull(message = "Product Id is required")
    private Long productId;

    @NotNull(message = "Quantity is required")
    @Min(value=1, message = "Quantity must be at least 1")
    private Integer quantity;
}

