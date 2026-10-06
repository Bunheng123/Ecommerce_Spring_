package com.setec.stock_inventory.repo;

import com.setec.stock_inventory.entity.WholesaleOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WholesaleOrderRepository extends JpaRepository<WholesaleOrder, Long> {

    List<WholesaleOrder> findByBuyerId(Long buyerId);

    @Query("SELECT DISTINCT w FROM WholesaleOrder w " +
           "LEFT JOIN FETCH w.items i " +
           "LEFT JOIN FETCH i.product " +
           "LEFT JOIN FETCH w.buyer " +
           "LEFT JOIN FETCH w.createdBy " +
           "WHERE w.id = :id")
    Optional<WholesaleOrder> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT DISTINCT w FROM WholesaleOrder w " +
           "LEFT JOIN FETCH w.items i " +
           "LEFT JOIN FETCH i.product " +
           "LEFT JOIN FETCH w.buyer " +
           "LEFT JOIN FETCH w.createdBy " +
           "ORDER BY w.orderDate DESC")
    List<WholesaleOrder> findAllWithDetails();

    @Query("SELECT DISTINCT w FROM WholesaleOrder w " +
           "LEFT JOIN FETCH w.items i " +
           "LEFT JOIN FETCH i.product " +
           "LEFT JOIN FETCH w.buyer " +
           "LEFT JOIN FETCH w.createdBy " +
           "WHERE w.buyer.id = :buyerId " +
           "ORDER BY w.orderDate DESC")
    List<WholesaleOrder> findByBuyerIdWithDetails(@Param("buyerId") Long buyerId);
}
