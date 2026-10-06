package com.setec.stock_inventory.repo;

import com.setec.stock_inventory.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    Optional<CartItem> findByCartIdAndProductId(Long cartId, Long productId);

    Optional<CartItem> findByIdAndCartId(Long id, Long cartId);

    void deleteByProductId(Long productId);
}
