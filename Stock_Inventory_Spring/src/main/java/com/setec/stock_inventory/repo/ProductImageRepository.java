package com.setec.stock_inventory.repo;

import com.setec.stock_inventory.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {

    List<ProductImage> findByProductId(Long productId);

    Optional<ProductImage> findByIdAndProductId(Long id, Long productId);

    void deleteByProductId(Long productId);
}
