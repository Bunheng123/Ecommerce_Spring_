package com.setec.stock_inventory.repo;

import com.setec.stock_inventory.entity.Product;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository 
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByCategoryId(Long categoryId);

    List<Product> findByCategoryIdAndActiveTrue(Long categoryId);

    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true")
    List<Product> findAllWithDetails();

    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p")
    List<Product> findAllIncludingInactiveWithDetails();

    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.stock <= COALESCE(p.reorderLevel, 10)")
    List<Product> findLowStockProducts();
}
