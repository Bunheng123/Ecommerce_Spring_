package com.setec.stock_inventory.controller;

import com.setec.stock_inventory.dto.ApiResponse;
import com.setec.stock_inventory.dto.Request.WholesaleOrderRequestDto;
import com.setec.stock_inventory.dto.Response.WholesaleOrderResponseDto;
import com.setec.stock_inventory.service.WholesaleOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wholesale-orders")
@RequiredArgsConstructor
public class WholesaleOrderController {

    private final WholesaleOrderService wholesaleOrderService;

    @PostMapping
    public ResponseEntity<ApiResponse<WholesaleOrderResponseDto>> createWholesaleOrder(
            @Valid @RequestBody WholesaleOrderRequestDto request) {
        WholesaleOrderResponseDto response = wholesaleOrderService.createWholesaleOrder(request);
        return new ResponseEntity<>(
                ApiResponse.success("Wholesale order created successfully", response),
                HttpStatus.CREATED
        );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<WholesaleOrderResponseDto>>> getAllWholesaleOrders() {
        List<WholesaleOrderResponseDto> response = wholesaleOrderService.getAllWholesaleOrders();
        return ResponseEntity.ok(ApiResponse.success("Wholesale orders retrieved successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WholesaleOrderResponseDto>> getWholesaleOrderById(@PathVariable Long id) {
        WholesaleOrderResponseDto response = wholesaleOrderService.getWholesaleOrderById(id);
        return ResponseEntity.ok(ApiResponse.success("Wholesale order retrieved successfully", response));
    }

    @GetMapping("/buyer/{buyerId}")
    public ResponseEntity<ApiResponse<List<WholesaleOrderResponseDto>>> getWholesaleOrdersByBuyerId(
            @PathVariable Long buyerId) {
        List<WholesaleOrderResponseDto> response = wholesaleOrderService.getWholesaleOrdersByBuyerId(buyerId);
        return ResponseEntity.ok(ApiResponse.success("Wholesale orders retrieved successfully", response));
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<WholesaleOrderResponseDto>> completeWholesaleOrder(@PathVariable Long id) {
        WholesaleOrderResponseDto response = wholesaleOrderService.completeWholesaleOrder(id);
        return ResponseEntity.ok(ApiResponse.success("Wholesale order completed successfully", response));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<WholesaleOrderResponseDto>> cancelWholesaleOrder(@PathVariable Long id) {
        WholesaleOrderResponseDto response = wholesaleOrderService.cancelWholesaleOrder(id);
        return ResponseEntity.ok(ApiResponse.success("Wholesale order cancelled successfully", response));
    }
}
