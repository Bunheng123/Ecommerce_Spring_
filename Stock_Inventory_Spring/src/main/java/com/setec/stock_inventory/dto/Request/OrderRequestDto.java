package com.setec.stock_inventory.dto.Request;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor 
@NoArgsConstructor
public class OrderRequestDto {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotEmpty(message = "Order Item must not empty")
    private List<OrderItemRequestDto> orderItemList;
}
