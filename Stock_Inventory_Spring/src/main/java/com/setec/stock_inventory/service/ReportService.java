package com.setec.stock_inventory.service;

import com.setec.stock_inventory.dto.Response.report.ReportSummaryResponseDto;

import java.time.LocalDate;

public interface ReportService {

    ReportSummaryResponseDto getReportSummary(
            LocalDate startDate,
            LocalDate endDate,
            String channel,
            Long categoryId,
            Long brandId,
            Boolean unbrandedOnly
    );
}
