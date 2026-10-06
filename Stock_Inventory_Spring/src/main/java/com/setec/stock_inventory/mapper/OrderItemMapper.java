package com.setec.stock_inventory.mapper;

import com.setec.stock_inventory.dto.Response.OrderItemResponseDto;
import com.setec.stock_inventory.entity.OrderItem;

public class OrderItemMapper {
    public static OrderItemResponseDto toResponse(OrderItem item) {
        if (item == null) {
            return null;
        }

        return OrderItemResponseDto.builder()
                .id(item.getId())
                .productId(item.getProduct() != null ? item.getProduct().getId() : null)
                .productName(item.getProduct() != null ? item.getProduct().getName() : null)
                .quantity(item.getQuantity())
                .price(item.getPrice())
                .subTotal(item.getPrice() * item.getQuantity())
                .build();
    }

}
