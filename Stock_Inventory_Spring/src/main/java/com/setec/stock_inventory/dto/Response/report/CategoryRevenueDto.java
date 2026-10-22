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
public class CategoryRevenueDto {
    private Long id;
    private String name;
    private int unitsSold;
    private BigDecimal revenue;
    private BigDecimal cogs;
    private BigDecimal profit;
    private BigDecimal sharePercent;
}
