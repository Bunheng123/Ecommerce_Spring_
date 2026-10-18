package com.setec.stock_inventory.repo;

import com.setec.stock_inventory.entity.Product;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository 
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    List<Product> findByCategoryId(Long categoryId);

    List<Product> findByCategoryIdAndActiveTrue(Long categoryId);

    List<Product> findByBrandId(Long brandId);

    @EntityGraph(attributePaths = {"category", "brand"})
    @Query("SELECT p FROM Product p WHERE p.active = true")
    List<Product> findAllWithDetails();

    @EntityGraph(attributePaths = {"category", "brand"})
    @Query("SELECT p FROM Product p")
    List<Product> findAllIncludingInactiveWithDetails();

    @EntityGraph(attributePaths = {"category", "brand"})
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.stock <= COALESCE(p.reorderLevel, 10)")
    List<Product> findLowStockProducts();

    @Query("SELECT DISTINCT b.name FROM Product p JOIN p.brand b WHERE b.name IS NOT NULL AND TRIM(b.name) != '' ORDER BY b.name ASC")
    List<String> findDistinctBrands();

    long countByBrandId(Long brandId);

    @Modifying
    @Query("UPDATE Product p SET p.brand = NULL WHERE p.brand.id = :brandId")
    void unlinkBrandFromProducts(@Param("brandId") Long brandId);
}
