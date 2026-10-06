package com.setec.stock_inventory.dto.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartResponseDto {
    private Long id;
    private Long userId;
    private List<CartItemResponseDto> items;
    private double totalAmount;
}
