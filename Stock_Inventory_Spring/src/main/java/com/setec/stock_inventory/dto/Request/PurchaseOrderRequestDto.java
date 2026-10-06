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
public class PurchaseOrderRequestDto {

    @NotNull(message = "Supplier ID is required")
    private Long supplierId;

    @NotEmpty(message = "Purchase order items cannot be empty")
    @Valid
    private List<PurchaseOrderItemRequestDto> items;
}
