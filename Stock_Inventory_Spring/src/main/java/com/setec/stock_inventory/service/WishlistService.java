package com.setec.stock_inventory.service;

import com.setec.stock_inventory.dto.Response.ProductResponseDto;

import java.util.List;

public interface WishlistService {

    List<ProductResponseDto> getWishlist();

    ProductResponseDto addToWishlist(Long productId);

    void removeFromWishlist(Long productId);
}
