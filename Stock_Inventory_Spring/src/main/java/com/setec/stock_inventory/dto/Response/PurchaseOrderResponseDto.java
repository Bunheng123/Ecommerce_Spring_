package com.setec.stock_inventory.dto.Response;

import com.setec.stock_inventory.enums.PurchaseOrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderResponseDto {
    private Long id;
    private Long supplierId;
    private String supplierName;
    private Long createdById;
    private String createdByUsername;
    private PurchaseOrderStatus status;
    private double totalCost;
    private LocalDateTime orderDate;
    private LocalDateTime updateDate;
    private List<PurchaseOrderItemResponseDto> items;
}
