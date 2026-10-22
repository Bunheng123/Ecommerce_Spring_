package com.setec.stock_inventory.dto.Response.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductPerformanceDto {
    private Long productId;
    private String productName;
    private Long categoryId;
    private String categoryName;
    private Long brandId;
    private String brandName;
    private int unitsSold;
    private BigDecimal avgSellingPrice;
    private BigDecimal unitCost;
    private BigDecimal revenue;
    private BigDecimal cogs;
    private BigDecimal profit;
    private BigDecimal marginPercent;
}
