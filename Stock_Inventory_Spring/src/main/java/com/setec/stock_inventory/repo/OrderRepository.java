package com.setec.stock_inventory.repo;

import com.setec.stock_inventory.entity.Order;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("""
        SELECT DISTINCT o
        FROM Order o
        LEFT JOIN FETCH o.user
        LEFT JOIN FETCH o.orderItems i
        LEFT JOIN FETCH i.product
        WHERE o.id = :id
    """)
    Optional<Order> findByIdWithDetails(Long id);

    @Query("""
        SELECT DISTINCT o
        FROM Order o
        LEFT JOIN FETCH o.user
        LEFT JOIN FETCH o.orderItems i
        LEFT JOIN FETCH i.product
    """)
    List<Order> findAllWithDetails();

    @Query("""
        SELECT DISTINCT o
        FROM Order o
        LEFT JOIN FETCH o.user
        LEFT JOIN FETCH o.orderItems i
        LEFT JOIN FETCH i.product
        WHERE o.user.id = :userId
    """)
    List<Order> findByUserIdWithDetails(Long userId);
}

