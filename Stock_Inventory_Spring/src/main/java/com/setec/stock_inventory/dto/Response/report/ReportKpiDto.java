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
public class ReportKpiDto {
    private int totalOrders;
    private int retailOrdersCount;
    private int wholesaleOrdersCount;
    private int totalUnitsSold;
    private BigDecimal grossRevenue;
    private BigDecimal netProductRevenue;
    private BigDecimal totalTaxCollected;
    private BigDecimal totalShippingCollected;
    private BigDecimal totalCogs;
    private BigDecimal grossProfit;
    private BigDecimal profitMarginPercent;
    private long itemsMissingCost;
}
