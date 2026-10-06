package com.setec.stock_inventory.service;

import com.setec.stock_inventory.dto.Request.WholesaleOrderRequestDto;
import com.setec.stock_inventory.dto.Response.WholesaleOrderResponseDto;

import java.util.List;

public interface WholesaleOrderService {

    WholesaleOrderResponseDto createWholesaleOrder(WholesaleOrderRequestDto request);

    WholesaleOrderResponseDto getWholesaleOrderById(Long id);

    List<WholesaleOrderResponseDto> getAllWholesaleOrders();

    List<WholesaleOrderResponseDto> getWholesaleOrdersByBuyerId(Long buyerId);

    WholesaleOrderResponseDto completeWholesaleOrder(Long id);

    WholesaleOrderResponseDto cancelWholesaleOrder(Long id);
}
