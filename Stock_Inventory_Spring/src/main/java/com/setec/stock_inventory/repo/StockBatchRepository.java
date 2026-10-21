package com.setec.stock_inventory.repo;

import com.setec.stock_inventory.entity.StockBatch;
import com.setec.stock_inventory.enums.BatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockBatchRepository extends JpaRepository<StockBatch, Long> {

    List<StockBatch> findByProductIdOrderByReceivedDateAscIdAsc(Long productId);

    List<StockBatch> findByProductIdAndRemainingQuantityGreaterThanOrderByReceivedDateAscIdAsc(Long productId, int minRemaining);

    List<StockBatch> findByProductIdOrderByReceivedDateDescIdDesc(Long productId);

    Optional<StockBatch> findFirstByProductIdAndStatusOrderByReceivedDateAscIdAsc(Long productId, BatchStatus status);

    boolean existsByProductId(Long productId);

    boolean existsByBatchNumber(String batchNumber);

    void deleteByProductId(Long productId);

    @Query("SELECT b FROM StockBatch b WHERE b.status = :status ORDER BY b.receivedDate ASC, b.id ASC")
    List<StockBatch> findByStatusOrderByReceivedDateAscIdAsc(@Param("status") BatchStatus status);
}
