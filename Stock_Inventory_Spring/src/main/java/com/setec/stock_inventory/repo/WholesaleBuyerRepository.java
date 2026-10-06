package com.setec.stock_inventory.repo;

import com.setec.stock_inventory.entity.WholesaleBuyer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WholesaleBuyerRepository extends JpaRepository<WholesaleBuyer, Long> {
    List<WholesaleBuyer> findByActiveTrue();
}
