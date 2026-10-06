package com.setec.stock_inventory.dto.Response;

import com.setec.stock_inventory.enums.BuyerType;
import com.setec.stock_inventory.enums.WholesaleOrderStatus;
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
public class WholesaleOrderResponseDto {
    private Long id;
    private Long buyerId;
    private String buyerName;
    private BuyerType buyerType;
    private Long createdById;
    private String createdByUsername;
    private WholesaleOrderStatus status;
    private double totalAmount;
    private LocalDateTime orderDate;
    private LocalDateTime updateDate;
    private List<WholesaleOrderItemResponseDto> items;
}
