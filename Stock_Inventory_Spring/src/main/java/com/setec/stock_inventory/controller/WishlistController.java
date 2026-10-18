package com.setec.stock_inventory.controller;

import com.setec.stock_inventory.dto.ApiResponse;
import com.setec.stock_inventory.dto.Response.ProductResponseDto;
import com.setec.stock_inventory.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductResponseDto>>> getWishlist() {
        List<ProductResponseDto> items = wishlistService.getWishlist();
        return ResponseEntity.ok(ApiResponse.success("Wishlist retrieved successfully", items));
    }

    @PostMapping("/{productId:[0-9]+}")
    public ResponseEntity<ApiResponse<ProductResponseDto>> addToWishlist(@PathVariable Long productId) {
        ProductResponseDto item = wishlistService.addToWishlist(productId);
        return ResponseEntity.ok(ApiResponse.success("Product added to wishlist successfully", item));
    }

    @DeleteMapping("/{productId:[0-9]+}")
    public ResponseEntity<ApiResponse<Void>> removeFromWishlist(@PathVariable Long productId) {
        wishlistService.removeFromWishlist(productId);
        return ResponseEntity.ok(ApiResponse.success("Product removed from wishlist successfully", null));
    }
}
