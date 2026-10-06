package com.setec.stock_inventory.controller;

import com.setec.stock_inventory.dto.ApiResponse;
import com.setec.stock_inventory.dto.Request.CartItemRequestDto;
import com.setec.stock_inventory.dto.Request.CartItemUpdateRequestDto;
import com.setec.stock_inventory.dto.Request.CheckoutRequestDto;
import com.setec.stock_inventory.dto.Response.CartResponseDto;
import com.setec.stock_inventory.dto.Response.OrderResponseDto;
import com.setec.stock_inventory.service.CartService;
import com.setec.stock_inventory.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;
    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<ApiResponse<CartResponseDto>> getCart() {
        CartResponseDto cart = cartService.getCart();
        return ResponseEntity.ok(ApiResponse.success("Cart retrieved successfully", cart));
    }

    @PostMapping("/items")
    public ResponseEntity<ApiResponse<CartResponseDto>> addItem(
            @Valid @RequestBody CartItemRequestDto request) {
        CartResponseDto cart = cartService.addItem(request);
        return ResponseEntity.ok(ApiResponse.success("Item added to cart successfully", cart));
    }

    @PutMapping("/items/{itemId:[0-9]+}")
    public ResponseEntity<ApiResponse<CartResponseDto>> updateItem(
            @PathVariable Long itemId,
            @Valid @RequestBody CartItemUpdateRequestDto request) {
        CartResponseDto cart = cartService.updateItem(itemId, request);
        return ResponseEntity.ok(ApiResponse.success("Cart item updated successfully", cart));
    }

    @DeleteMapping("/items/{itemId:[0-9]+}")
    public ResponseEntity<ApiResponse<CartResponseDto>> removeItem(@PathVariable Long itemId) {
        CartResponseDto cart = cartService.removeItem(itemId);
        return ResponseEntity.ok(ApiResponse.success("Item removed from cart successfully", cart));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<CartResponseDto>> clearCart() {
        CartResponseDto cart = cartService.clearCart();
        return ResponseEntity.ok(ApiResponse.success("Cart cleared successfully", cart));
    }

    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<OrderResponseDto>> checkout(
            @Valid @RequestBody CheckoutRequestDto request) {
        OrderResponseDto order = orderService.checkoutCart(request);
        return new ResponseEntity<>(
                ApiResponse.success("Checkout completed successfully", order),
                HttpStatus.CREATED
        );
    }
}
