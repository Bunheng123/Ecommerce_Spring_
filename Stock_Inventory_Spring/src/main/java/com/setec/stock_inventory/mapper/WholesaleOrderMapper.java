package com.setec.stock_inventory.mapper;

import com.setec.stock_inventory.dto.Response.WholesaleOrderItemResponseDto;
import com.setec.stock_inventory.dto.Response.WholesaleOrderResponseDto;
import com.setec.stock_inventory.entity.WholesaleOrder;
import com.setec.stock_inventory.entity.WholesaleOrderItem;

import java.util.Collections;
import java.util.List;

public class WholesaleOrderMapper {

    public static WholesaleOrderResponseDto toResponse(WholesaleOrder order) {
        if (order == null) {
            return null;
        }

        List<WholesaleOrderItemResponseDto> itemResponses = order.getItems() != null
                ? order.getItems().stream().map(WholesaleOrderMapper::toItemResponse).toList()
                : Collections.emptyList();

        boolean anyBelowCost = itemResponses.stream().anyMatch(it -> it != null && it.isBelowCostPrice());

        return WholesaleOrderResponseDto.builder()
                .id(order.getId())
                .buyerId(order.getBuyer() != null ? order.getBuyer().getId() : null)
                .buyerName(order.getBuyer() != null ? order.getBuyer().getName() : null)
                .buyerType(order.getBuyer() != null ? order.getBuyer().getType() : null)
                .createdById(order.getCreatedBy() != null ? order.getCreatedBy().getId() : null)
                .createdByUsername(order.getCreatedBy() != null ? order.getCreatedBy().getUsername() : null)
                .status(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .orderDate(order.getOrderDate())
                .updateDate(order.getUpdateDate())
                .items(itemResponses)
                .belowCostPrice(anyBelowCost)
                .build();
    }

    public static WholesaleOrderItemResponseDto toItemResponse(WholesaleOrderItem item) {
        if (item == null) {
            return null;
        }

        Double cp = item.getProduct() != null ? item.getProduct().getCostPrice() : null;
        java.math.BigDecimal productCost = cp != null
                ? java.math.BigDecimal.valueOf(cp).setScale(2, java.math.RoundingMode.HALF_UP)
                : java.math.BigDecimal.ZERO;
        boolean belowCost = productCost.compareTo(java.math.BigDecimal.ZERO) > 0
                && java.math.BigDecimal.valueOf(item.getWholesalePrice()).compareTo(productCost) < 0;

        return WholesaleOrderItemResponseDto.builder()
                .id(item.getId())
                .productId(item.getProduct() != null ? item.getProduct().getId() : null)
                .productName(item.getProduct() != null ? item.getProduct().getName() : null)
                .quantity(item.getQuantity())
                .wholesalePrice(item.getWholesalePrice())
                .subtotal(item.getQuantity() * item.getWholesalePrice())
                .belowCostPrice(belowCost)
                .productCostPrice(productCost)
                .build();
    }
}
