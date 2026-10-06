package com.setec.stock_inventory.dto.Request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WholesaleOrderRequestDto {

    @NotNull(message = "Buyer ID is required")
    private Long buyerId;

    @NotEmpty(message = "Wholesale order items cannot be empty")
    @Valid
    private List<WholesaleOrderItemRequestDto> items;
}
