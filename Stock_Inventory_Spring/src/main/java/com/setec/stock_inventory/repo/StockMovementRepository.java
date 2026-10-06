package com.setec.stock_inventory.repo;

import com.setec.stock_inventory.entity.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    List<StockMovement> findByProductIdOrderByCreatedAtDesc(Long productId);

    List<StockMovement> findByProductIdOrderByIdDesc(Long productId);

    void deleteByProductId(Long productId);
}
