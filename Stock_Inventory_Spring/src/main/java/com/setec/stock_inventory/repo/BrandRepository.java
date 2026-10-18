package com.setec.stock_inventory.repo;

import com.setec.stock_inventory.entity.Brand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BrandRepository extends JpaRepository<Brand, Long> {

    Optional<Brand> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    @Query("SELECT b FROM Brand b ORDER BY b.name ASC")
    List<Brand> findAllOrderByNameAsc();

    @Query("SELECT COUNT(p) FROM Product p WHERE p.brand.id = :brandId")
    long countProductsByBrandId(@Param("brandId") Long brandId);
}
