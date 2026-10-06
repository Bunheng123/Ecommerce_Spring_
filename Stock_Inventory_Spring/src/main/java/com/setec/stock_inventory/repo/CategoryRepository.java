package com.setec.stock_inventory.repo;

import com.setec.stock_inventory.entity.Category;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    boolean existsByName(String name);

    // Checks if any OTHER category already has this name (useful during update)
    boolean existsByNameAndIdNot(String name, Long id);

    Optional<Category> findByName(String name);
}
