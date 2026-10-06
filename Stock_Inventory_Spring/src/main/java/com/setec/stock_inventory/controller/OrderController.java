package com.setec.stock_inventory.controller;

import com.setec.stock_inventory.dto.ApiResponse;
import com.setec.stock_inventory.dto.Request.OrderRequestDto;
import com.setec.stock_inventory.dto.Request.OrderStatusRequestDto;
import com.setec.stock_inventory.dto.Request.PaymentStatusRequestDto;
import com.setec.stock_inventory.dto.Response.OrderResponseDto;
import com.setec.stock_inventory.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponseDto>> createOrder(
            @Valid @RequestBody OrderRequestDto request
    ) {
        OrderResponseDto order = orderService.createOrder(request);
        return new ResponseEntity<>(
                ApiResponse.success("Order created successfully", order),
                HttpStatus.CREATED
        );
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<OrderResponseDto>>> getMyOrders() {
        List<OrderResponseDto> orders = orderService.getMyOrders();
        return ResponseEntity.ok(
                ApiResponse.success("My orders retrieved successfully", orders)
        );
    }

    @GetMapping("/{id:[0-9]+}")
    public ResponseEntity<ApiResponse<OrderResponseDto>> getOrderById(@PathVariable Long id) {
        OrderResponseDto order = orderService.getOrderById(id);
        return ResponseEntity.ok(
                ApiResponse.success("Order retrieved successfully", order)
        );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderResponseDto>>> getAllOrders() {
        List<OrderResponseDto> orders = orderService.getAllOrders();
        return ResponseEntity.ok(
                ApiResponse.success("Orders retrieved successfully", orders)
        );
    }

    @GetMapping("/user/{userId:[0-9]+}")
    public ResponseEntity<ApiResponse<List<OrderResponseDto>>> getOrdersByUserId(@PathVariable Long userId) {
        List<OrderResponseDto> orders = orderService.getOrdersByUserId(userId);
        return ResponseEntity.ok(
                ApiResponse.success("User orders retrieved successfully", orders)
        );
    }

    @PutMapping("/{id:[0-9]+}")
    public ResponseEntity<ApiResponse<OrderResponseDto>> updateOrderStatus(
            @PathVariable Long id,
            @Valid @RequestBody OrderStatusRequestDto request
    ) {
        OrderResponseDto order = orderService.updateStatus(id, request.getStatus());
        return ResponseEntity.ok(
                ApiResponse.success("Order status updated successfully", order)
        );
    }

    @PostMapping("/{id:[0-9]+}/cancel")
    public ResponseEntity<ApiResponse<OrderResponseDto>> selfCancelOrder(@PathVariable Long id) {
        OrderResponseDto order = orderService.selfCancelOrder(id);
        return ResponseEntity.ok(
                ApiResponse.success("Order cancelled successfully", order)
        );
    }

    @PutMapping("/{id:[0-9]+}/payment-status")
    public ResponseEntity<ApiResponse<OrderResponseDto>> updatePaymentStatus(
            @PathVariable Long id,
            @Valid @RequestBody PaymentStatusRequestDto request) {
        OrderResponseDto order = orderService.updatePaymentStatus(id, request.getPaymentStatus());
        return ResponseEntity.ok(
                ApiResponse.success("Payment status updated successfully", order)
        );
    }
}
