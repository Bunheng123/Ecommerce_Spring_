package com.setec.stock_inventory.repo;

import com.setec.stock_inventory.entity.WholesaleOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WholesaleOrderItemRepository extends JpaRepository<WholesaleOrderItem, Long> {
    List<WholesaleOrderItem> findByWholesaleOrderId(Long wholesaleOrderId);
}
