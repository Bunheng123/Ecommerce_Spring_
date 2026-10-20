package com.setec.stock_inventory.dto.email;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockAlertEmailPayload {
    private Long productId;
    private String productName;
    private String brandName;
    private String categoryName;
    private int previousStock;
    private int currentStock;
    private int reorderLevel;
    private String triggerSource;
}
