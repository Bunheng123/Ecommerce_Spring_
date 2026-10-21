package com.setec.stock_inventory.service;

import com.setec.stock_inventory.dto.Response.StockBatchResponseDto;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.entity.PurchaseOrder;
import com.setec.stock_inventory.entity.StockBatch;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface StockBatchService {

    StockBatch createBatch(Product product, PurchaseOrder purchaseOrder, BigDecimal unitCost, int quantity, LocalDateTime receivedDate, LocalDate expiryDate);

    void depleteStockFifo(Product product, int quantityToDeplete);

    void restoreStock(Product product, int quantityToRestore);

    List<StockBatchResponseDto> getProductBatches(Long productId);

    BigDecimal getActiveFifoUnitCost(Long productId);

    Map<Long, BigDecimal> getAllActiveFifoUnitCosts();

    void backfillInitialBatches();
}
