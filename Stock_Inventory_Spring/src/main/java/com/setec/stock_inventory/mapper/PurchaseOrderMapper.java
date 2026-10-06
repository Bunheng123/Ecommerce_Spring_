package com.setec.stock_inventory.mapper;

import com.setec.stock_inventory.dto.Response.PurchaseOrderItemResponseDto;
import com.setec.stock_inventory.dto.Response.PurchaseOrderResponseDto;
import com.setec.stock_inventory.entity.PurchaseOrder;
import com.setec.stock_inventory.entity.PurchaseOrderItem;

import java.util.Collections;
import java.util.List;

public class PurchaseOrderMapper {

    public static PurchaseOrderResponseDto toResponse(PurchaseOrder purchaseOrder) {
        if (purchaseOrder == null) {
            return null;
        }

        List<PurchaseOrderItemResponseDto> itemResponses = purchaseOrder.getItems() != null
                ? purchaseOrder.getItems().stream().map(PurchaseOrderMapper::toItemResponse).toList()
                : Collections.emptyList();

        return PurchaseOrderResponseDto.builder()
                .id(purchaseOrder.getId())
                .supplierId(purchaseOrder.getSupplier() != null ? purchaseOrder.getSupplier().getId() : null)
                .supplierName(purchaseOrder.getSupplier() != null ? purchaseOrder.getSupplier().getName() : null)
                .createdById(purchaseOrder.getCreatedBy() != null ? purchaseOrder.getCreatedBy().getId() : null)
                .createdByUsername(purchaseOrder.getCreatedBy() != null ? purchaseOrder.getCreatedBy().getUsername() : null)
                .status(purchaseOrder.getStatus())
                .totalCost(purchaseOrder.getTotalCost())
                .orderDate(purchaseOrder.getOrderDate())
                .updateDate(purchaseOrder.getUpdateDate())
                .items(itemResponses)
                .build();
    }

    public static PurchaseOrderItemResponseDto toItemResponse(PurchaseOrderItem item) {
        if (item == null) {
            return null;
        }

        return PurchaseOrderItemResponseDto.builder()
                .id(item.getId())
                .productId(item.getProduct() != null ? item.getProduct().getId() : null)
                .productName(item.getProduct() != null ? item.getProduct().getName() : null)
                .quantity(item.getQuantity())
                .costPrice(item.getCostPrice())
                .subtotal(item.getQuantity() * item.getCostPrice())
                .build();
    }
}
