package com.setec.stock_inventory.controller;

import com.setec.stock_inventory.dto.ApiResponse;
import com.setec.stock_inventory.dto.Request.PurchaseOrderRequestDto;
import com.setec.stock_inventory.dto.Response.PurchaseOrderResponseDto;
import com.setec.stock_inventory.service.PurchaseOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    @PostMapping
    public ResponseEntity<ApiResponse<PurchaseOrderResponseDto>> createPurchaseOrder(
            @Valid @RequestBody PurchaseOrderRequestDto request) {
        PurchaseOrderResponseDto response = purchaseOrderService.createPurchaseOrder(request);
        return new ResponseEntity<>(
                ApiResponse.success("Purchase order created successfully", response),
                HttpStatus.CREATED
        );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PurchaseOrderResponseDto>>> getAllPurchaseOrders() {
        List<PurchaseOrderResponseDto> response = purchaseOrderService.getAllPurchaseOrders();
        return ResponseEntity.ok(ApiResponse.success("Purchase orders retrieved successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PurchaseOrderResponseDto>> getPurchaseOrderById(@PathVariable Long id) {
        PurchaseOrderResponseDto response = purchaseOrderService.getPurchaseOrderById(id);
        return ResponseEntity.ok(ApiResponse.success("Purchase order retrieved successfully", response));
    }

    @GetMapping("/supplier/{supplierId}")
    public ResponseEntity<ApiResponse<List<PurchaseOrderResponseDto>>> getPurchaseOrdersBySupplierId(
            @PathVariable Long supplierId) {
        List<PurchaseOrderResponseDto> response = purchaseOrderService.getPurchaseOrdersBySupplierId(supplierId);
        return ResponseEntity.ok(ApiResponse.success("Purchase orders retrieved successfully", response));
    }

    @PutMapping("/{id}/receive")
    public ResponseEntity<ApiResponse<PurchaseOrderResponseDto>> receivePurchaseOrder(@PathVariable Long id) {
        PurchaseOrderResponseDto response = purchaseOrderService.receivePurchaseOrder(id);
        return ResponseEntity.ok(ApiResponse.success("Purchase order received successfully", response));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<PurchaseOrderResponseDto>> cancelPurchaseOrder(@PathVariable Long id) {
        PurchaseOrderResponseDto response = purchaseOrderService.cancelPurchaseOrder(id);
        return ResponseEntity.ok(ApiResponse.success("Purchase order cancelled successfully", response));
    }
}
