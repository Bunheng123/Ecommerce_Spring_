package com.setec.stock_inventory.mapper;

import com.setec.stock_inventory.dto.Response.CartItemResponseDto;
import com.setec.stock_inventory.dto.Response.CartResponseDto;
import com.setec.stock_inventory.entity.Cart;
import com.setec.stock_inventory.entity.CartItem;

import java.util.Collections;
import java.util.List;

public class CartMapper {

    public static CartResponseDto toResponse(Cart cart) {
        if (cart == null) {
            return null;
        }

        List<CartItemResponseDto> itemDtos = cart.getItems() != null
                ? cart.getItems().stream().map(CartMapper::toItemResponse).toList()
                : Collections.emptyList();

        double totalAmount = itemDtos.stream()
                .mapToDouble(CartItemResponseDto::getSubtotal)
                .sum();

        return CartResponseDto.builder()
                .id(cart.getId())
                .userId(cart.getUser() != null ? cart.getUser().getId() : null)
                .items(itemDtos)
                .totalAmount(totalAmount)
                .build();
    }

    public static CartItemResponseDto toItemResponse(CartItem item) {
        if (item == null) {
            return null;
        }

        double price = (item.getProduct() != null) ? item.getProduct().getPrice() : 0.0;
        double subtotal = price * item.getQuantity();

        return CartItemResponseDto.builder()
                .id(item.getId())
                .productId(item.getProduct() != null ? item.getProduct().getId() : null)
                .productName(item.getProduct() != null ? item.getProduct().getName() : null)
                .productImageUrl(item.getProduct() != null ? item.getProduct().getImageUrl() : null)
                .price(price)
                .quantity(item.getQuantity())
                .subtotal(subtotal)
                .build();
    }
}
