package com.setec.stock_inventory.mapper;

import com.setec.stock_inventory.dto.Response.OrderItemResponseDto;
import com.setec.stock_inventory.dto.Response.OrderResponseDto;
import com.setec.stock_inventory.entity.Order;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class OrderMapper {
    public static OrderResponseDto toResponse(Order order) {
        if (order == null) {
            return null;
        }

        List<OrderItemResponseDto> itemResponses = order.getOrderItems() != null ?
                order.getOrderItems().stream()
                        .map(OrderItemMapper::toResponse)
                        .collect(Collectors.toList()) : Collections.emptyList();

        return OrderResponseDto.builder()
                .id(order.getId())
                .orderDate(order.getOrderDate())
                .totalAmount((double) order.getTotalAmount())
                .status(order.getStatus())
                .userId(order.getUser() != null ? order.getUser().getId() : null)
                .username(order.getUser() != null ? order.getUser().getUsername() : null)
                .shippingAddress(order.getShippingAddress())
                .paymentStatus(order.getPaymentStatus())
                .paymentMethod(order.getPaymentMethod())
                .customerNote(order.getCustomerNote())
                .updateAt(order.getUpdateDate())
                .orderItems(itemResponses)
                .build();
    }
}
