package com.setec.stock_inventory.dto.Response.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportSummaryResponseDto {
    private ReportKpiDto kpis;
    private SalesOverTimeDto salesOverTime;

    @Builder.Default
    private List<ProductPerformanceDto> bestSellers = new ArrayList<>();

    @Builder.Default
    private List<CategoryRevenueDto> revenueByCategory = new ArrayList<>();

    @Builder.Default
    private List<BrandRevenueDto> revenueByBrand = new ArrayList<>();
}
