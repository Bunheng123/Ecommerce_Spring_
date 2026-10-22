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
public class SalesOverTimeDto {
    @Builder.Default
    private List<SalesPeriodDto> daily = new ArrayList<>();

    @Builder.Default
    private List<SalesPeriodDto> weekly = new ArrayList<>();

    @Builder.Default
    private List<SalesPeriodDto> monthly = new ArrayList<>();
}
