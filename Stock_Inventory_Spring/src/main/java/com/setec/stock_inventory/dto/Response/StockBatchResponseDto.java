package com.setec.stock_inventory.dto.Response;

import com.setec.stock_inventory.enums.BatchStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockBatchResponseDto {
    private Long id;
    private String batchNumber;
    private Long productId;
    private String productName;
    private Long purchaseOrderId;
    private String source;
    private BigDecimal unitCost;
    private Integer initialQuantity;
    private Integer remainingQuantity;
    private LocalDateTime receivedDate;
    private LocalDate expiryDate;
    private BatchStatus status;
    private boolean nextFifo;
}
