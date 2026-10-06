package com.setec.stock_inventory.service;

import com.setec.stock_inventory.dto.Request.CheckoutRequestDto;
import com.setec.stock_inventory.dto.Request.OrderRequestDto;
import com.setec.stock_inventory.dto.Response.OrderResponseDto;
import com.setec.stock_inventory.enums.PaymentStatus;

import java.util.List;

public interface OrderService {

    OrderResponseDto createOrder(OrderRequestDto request);

    OrderResponseDto checkoutCart(CheckoutRequestDto request);

    OrderResponseDto getOrderById(Long id);

    List<OrderResponseDto> getAllOrders();

    List<OrderResponseDto> getOrdersByUserId(Long userId);

    List<OrderResponseDto> getMyOrders();

    OrderResponseDto updateStatus(Long id, String status);

    OrderResponseDto selfCancelOrder(Long id);

    OrderResponseDto updatePaymentStatus(Long id, PaymentStatus status);
}
