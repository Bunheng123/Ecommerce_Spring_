package com.setec.stock_inventory.service;

import com.setec.stock_inventory.dto.Request.PurchaseOrderRequestDto;
import com.setec.stock_inventory.dto.Response.PurchaseOrderResponseDto;

import java.util.List;

public interface PurchaseOrderService {

    PurchaseOrderResponseDto createPurchaseOrder(PurchaseOrderRequestDto request);

    PurchaseOrderResponseDto getPurchaseOrderById(Long id);

    List<PurchaseOrderResponseDto> getAllPurchaseOrders();

    List<PurchaseOrderResponseDto> getPurchaseOrdersBySupplierId(Long supplierId);

    PurchaseOrderResponseDto receivePurchaseOrder(Long id);

    PurchaseOrderResponseDto cancelPurchaseOrder(Long id);
}
