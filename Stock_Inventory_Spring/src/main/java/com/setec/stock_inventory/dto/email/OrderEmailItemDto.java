package com.setec.stock_inventory.dto.email;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderEmailItemDto {
    private String productName;
    private int quantity;
    private BigDecimal price;
    private BigDecimal lineTotal;
    private String imageUrl;
}
