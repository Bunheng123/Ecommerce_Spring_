package com.setec.stock_inventory.dto.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderItemResponseDto {
    private Long id;
    private Long productId;
    private String productName;
    private int quantity;
    private double costPrice;
    private double subtotal;
}
