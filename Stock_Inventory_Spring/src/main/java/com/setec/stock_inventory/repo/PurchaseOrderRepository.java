package com.setec.stock_inventory.repo;

import com.setec.stock_inventory.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    List<PurchaseOrder> findBySupplierId(Long supplierId);

    @Query("SELECT DISTINCT p FROM PurchaseOrder p " +
           "LEFT JOIN FETCH p.items i " +
           "LEFT JOIN FETCH i.product " +
           "LEFT JOIN FETCH p.supplier " +
           "LEFT JOIN FETCH p.createdBy " +
           "WHERE p.id = :id")
    Optional<PurchaseOrder> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT DISTINCT p FROM PurchaseOrder p " +
           "LEFT JOIN FETCH p.items i " +
           "LEFT JOIN FETCH i.product " +
           "LEFT JOIN FETCH p.supplier " +
           "LEFT JOIN FETCH p.createdBy " +
           "ORDER BY p.orderDate DESC")
    List<PurchaseOrder> findAllWithDetails();

    @Query("SELECT DISTINCT p FROM PurchaseOrder p " +
           "LEFT JOIN FETCH p.items i " +
           "LEFT JOIN FETCH i.product " +
           "LEFT JOIN FETCH p.supplier " +
           "LEFT JOIN FETCH p.createdBy " +
           "WHERE p.supplier.id = :supplierId " +
           "ORDER BY p.orderDate DESC")
    List<PurchaseOrder> findBySupplierIdWithDetails(@Param("supplierId") Long supplierId);

    @Query("SELECT DISTINCT i.product.id FROM PurchaseOrder p JOIN p.items i WHERE p.status = com.setec.stock_inventory.enums.PurchaseOrderStatus.PENDING")
    java.util.Set<Long> findProductIdsInPendingPurchaseOrders();

    @Query("SELECT CASE WHEN COUNT(i) > 0 THEN true ELSE false END FROM PurchaseOrder p JOIN p.items i WHERE i.product.id = :productId AND p.status = com.setec.stock_inventory.enums.PurchaseOrderStatus.PENDING")
    boolean isProductInPendingPurchaseOrder(@Param("productId") Long productId);
}
