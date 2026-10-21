package com.setec.stock_inventory.service.impl;

import com.setec.stock_inventory.dto.Response.StockBatchResponseDto;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.entity.PurchaseOrder;
import com.setec.stock_inventory.entity.StockBatch;
import com.setec.stock_inventory.enums.BatchStatus;
import com.setec.stock_inventory.exception.ResourceNotFoundException;
import com.setec.stock_inventory.repo.ProductRepository;
import com.setec.stock_inventory.repo.StockBatchRepository;
import com.setec.stock_inventory.service.StockBatchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockBatchServiceImpl implements StockBatchService {

    private final StockBatchRepository stockBatchRepository;
    private final ProductRepository productRepository;
    private static final AtomicLong COUNTER = new AtomicLong(1);

    @Override
    @Transactional
    public StockBatch createBatch(Product product, PurchaseOrder purchaseOrder, BigDecimal unitCost, int quantity, LocalDateTime receivedDate, LocalDate expiryDate) {
        if (product == null) {
            throw new IllegalArgumentException("Product cannot be null when creating a stock batch");
        }
        if (quantity < 0) {
            throw new IllegalArgumentException("Quantity cannot be negative for a stock batch");
        }

        BigDecimal safeUnitCost = unitCost != null
                ? unitCost.setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        LocalDateTime safeReceivedDate = receivedDate != null ? receivedDate : LocalDateTime.now();
        String datePart = safeReceivedDate.format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        String basePrefix;
        if (purchaseOrder != null) {
            basePrefix = "BATCH-" + datePart + "-PO" + purchaseOrder.getId() + "-P" + product.getId();
        } else {
            basePrefix = "BATCH-" + datePart + "-MAN-P" + product.getId();
        }

        String batchNumber = generateUniqueBatchNumber(basePrefix);

        BatchStatus status = quantity > 0 ? BatchStatus.ACTIVE : BatchStatus.EXHAUSTED;

        StockBatch batch = StockBatch.builder()
                .batchNumber(batchNumber)
                .product(product)
                .purchaseOrder(purchaseOrder)
                .unitCost(safeUnitCost)
                .initialQuantity(quantity)
                .remainingQuantity(quantity)
                .receivedDate(safeReceivedDate)
                .expiryDate(expiryDate)
                .status(status)
                .build();

        StockBatch saved = stockBatchRepository.save(batch);
        log.info("Created StockBatch #{} ({}) for Product #{}: initialQty={}, remainingQty={}, unitCost={}, status={}",
                saved.getId(), saved.getBatchNumber(), product.getId(), saved.getInitialQuantity(),
                saved.getRemainingQuantity(), saved.getUnitCost(), saved.getStatus());
        return saved;
    }

    private String generateUniqueBatchNumber(String basePrefix) {
        String candidate = String.format("%s-%03d", basePrefix, COUNTER.getAndIncrement() % 1000);
        while (stockBatchRepository.existsByBatchNumber(candidate)) {
            candidate = String.format("%s-%03d", basePrefix, COUNTER.getAndIncrement() % 1000);
        }
        return candidate;
    }

    @Override
    @Transactional
    public void depleteStockFifo(Product product, int quantityToDeplete) {
        if (product == null || quantityToDeplete <= 0) {
            return;
        }

        List<StockBatch> activeBatches = stockBatchRepository
                .findByProductIdAndRemainingQuantityGreaterThanOrderByReceivedDateAscIdAsc(product.getId(), 0);

        int remainingToDeplete = quantityToDeplete;
        for (StockBatch batch : activeBatches) {
            if (remainingToDeplete <= 0) {
                break;
            }
            int available = batch.getRemainingQuantity();
            if (available <= remainingToDeplete) {
                batch.setRemainingQuantity(0);
                batch.setStatus(BatchStatus.EXHAUSTED);
                remainingToDeplete -= available;
                log.info("Depleted batch #{} completely to 0 (EXHAUSTED). Still needed: {}", batch.getBatchNumber(), remainingToDeplete);
            } else {
                batch.setRemainingQuantity(available - remainingToDeplete);
                remainingToDeplete = 0;
                log.info("Partially depleted batch #{}. Remaining quantity: {}", batch.getBatchNumber(), batch.getRemainingQuantity());
            }
            stockBatchRepository.save(batch);
        }

        if (remainingToDeplete > 0) {
            log.warn("Depleted all active batches for Product #{}, but still had deficit of {} units.",
                    product.getId(), remainingToDeplete);
        }
    }

    @Override
    @Transactional
    public void restoreStock(Product product, int quantityToRestore) {
        if (product == null || quantityToRestore <= 0) {
            return;
        }

        // Restore into most recently depleted batches first (reverse chronological)
        List<StockBatch> batches = stockBatchRepository.findByProductIdOrderByReceivedDateDescIdDesc(product.getId());

        int remainingToRestore = quantityToRestore;
        for (StockBatch batch : batches) {
            if (remainingToRestore <= 0) {
                break;
            }
            int room = batch.getInitialQuantity() - batch.getRemainingQuantity();
            if (room > 0) {
                int restoreAmount = Math.min(room, remainingToRestore);
                batch.setRemainingQuantity(batch.getRemainingQuantity() + restoreAmount);
                batch.setStatus(BatchStatus.ACTIVE);
                remainingToRestore -= restoreAmount;
                stockBatchRepository.save(batch);
                log.info("Restored {} units back into batch #{}. New remaining: {}",
                        restoreAmount, batch.getBatchNumber(), batch.getRemainingQuantity());
            }
        }

        // If capacity in existing batches was exhausted or no batches existed, allocate to newest batch or create new
        if (remainingToRestore > 0) {
            if (!batches.isEmpty()) {
                StockBatch latest = batches.get(0);
                latest.setRemainingQuantity(latest.getRemainingQuantity() + remainingToRestore);
                latest.setInitialQuantity(latest.getInitialQuantity() + remainingToRestore);
                latest.setStatus(BatchStatus.ACTIVE);
                stockBatchRepository.save(latest);
                log.info("Appended remaining restored {} units to latest batch #{}", remainingToRestore, latest.getBatchNumber());
            } else {
                BigDecimal fallbackCost = product.getCostPrice() != null
                        ? BigDecimal.valueOf(product.getCostPrice()).setScale(2, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
                createBatch(product, null, fallbackCost, remainingToRestore, LocalDateTime.now(), null);
                log.info("Created new restock batch with {} units for Product #{}", remainingToRestore, product.getId());
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockBatchResponseDto> getProductBatches(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Cannot find product with id: " + productId);
        }

        List<StockBatch> batches = stockBatchRepository.findByProductIdOrderByReceivedDateAscIdAsc(productId);
        List<StockBatchResponseDto> dtos = new ArrayList<>();

        boolean foundNextFifo = false;
        for (StockBatch b : batches) {
            boolean isNextFifo = false;
            if (!foundNextFifo && b.getStatus() == BatchStatus.ACTIVE && b.getRemainingQuantity() > 0) {
                isNextFifo = true;
                foundNextFifo = true;
            }

            String source;
            if (b.getPurchaseOrder() != null) {
                source = "Purchase Order #" + b.getPurchaseOrder().getId();
            } else if (b.getBatchNumber() != null && b.getBatchNumber().startsWith("BATCH-INIT")) {
                source = "Initial Stock";
            } else {
                source = "Manual Stock-In";
            }

            dtos.add(StockBatchResponseDto.builder()
                    .id(b.getId())
                    .batchNumber(b.getBatchNumber())
                    .productId(b.getProduct() != null ? b.getProduct().getId() : null)
                    .productName(b.getProduct() != null ? b.getProduct().getName() : null)
                    .purchaseOrderId(b.getPurchaseOrder() != null ? b.getPurchaseOrder().getId() : null)
                    .source(source)
                    .unitCost(b.getUnitCost())
                    .initialQuantity(b.getInitialQuantity())
                    .remainingQuantity(b.getRemainingQuantity())
                    .receivedDate(b.getReceivedDate())
                    .expiryDate(b.getExpiryDate())
                    .status(b.getStatus())
                    .nextFifo(isNextFifo)
                    .build());
        }

        return dtos;
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getActiveFifoUnitCost(Long productId) {
        if (productId == null) return null;
        Optional<StockBatch> activeBatch = stockBatchRepository
                .findFirstByProductIdAndStatusOrderByReceivedDateAscIdAsc(productId, BatchStatus.ACTIVE);
        return activeBatch.map(b -> b.getUnitCost()).orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<Long, BigDecimal> getAllActiveFifoUnitCosts() {
        List<StockBatch> activeBatches = stockBatchRepository.findByStatusOrderByReceivedDateAscIdAsc(BatchStatus.ACTIVE);
        Map<Long, BigDecimal> result = new HashMap<>();
        for (StockBatch b : activeBatches) {
            if (b.getProduct() != null && b.getProduct().getId() != null) {
                result.putIfAbsent(b.getProduct().getId(), b.getUnitCost());
            }
        }
        return result;
    }

    @Override
    @Transactional
    public void backfillInitialBatches() {
        List<Product> products = productRepository.findAll();
        int seededCount = 0;
        for (Product product : products) {
            if (product.getStock() > 0 && !stockBatchRepository.existsByProductId(product.getId())) {
                BigDecimal unitCost = product.getCostPrice() != null
                        ? BigDecimal.valueOf(product.getCostPrice()).setScale(2, RoundingMode.HALF_UP)
                        : (product.getPrice() > 0 ? BigDecimal.valueOf(product.getPrice()).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));

                String batchNumber = "BATCH-INIT-" + product.getId();
                if (stockBatchRepository.existsByBatchNumber(batchNumber)) {
                    batchNumber = "BATCH-INIT-" + product.getId() + "-" + System.currentTimeMillis() % 1000;
                }

                StockBatch initialBatch = StockBatch.builder()
                        .batchNumber(batchNumber)
                        .product(product)
                        .purchaseOrder(null)
                        .unitCost(unitCost)
                        .initialQuantity(product.getStock())
                        .remainingQuantity(product.getStock())
                        .status(BatchStatus.ACTIVE)
                        .receivedDate(LocalDateTime.now())
                        .build();

                stockBatchRepository.save(initialBatch);
                seededCount++;
            }
        }
        if (seededCount > 0) {
            log.info("Backfilled initial StockBatch records for {} existing products with stock > 0", seededCount);
        }
    }
}
