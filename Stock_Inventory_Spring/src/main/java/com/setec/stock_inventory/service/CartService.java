package com.setec.stock_inventory.service;

import com.setec.stock_inventory.dto.Request.CartItemRequestDto;
import com.setec.stock_inventory.dto.Request.CartItemUpdateRequestDto;
import com.setec.stock_inventory.dto.Response.CartResponseDto;

public interface CartService {

    CartResponseDto getCart();

    CartResponseDto addItem(CartItemRequestDto request);

    CartResponseDto updateItem(Long itemId, CartItemUpdateRequestDto request);

    CartResponseDto removeItem(Long itemId);

    CartResponseDto clearCart();
}
