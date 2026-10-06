package com.setec.stock_inventory.repo;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.setec.stock_inventory.entity.OrderItem;

import java.util.List;

@Repository 
public interface OrderItemRepository extends JpaRepository<OrderItem, Long>{

   @EntityGraph(attributePaths = {"product"})
   List<OrderItem> findByOrderId(Long orderId);

   boolean existsByProductId(Long productId);

   void deleteByProductId(Long productId);
}
