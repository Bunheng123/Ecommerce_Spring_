package com.setec.stock_inventory.dto.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemResponseDto {

    private Long id;
    private Long productId;
    private String productName;
    private int quantity;
    private Double price;
    private Double subTotal;
}
