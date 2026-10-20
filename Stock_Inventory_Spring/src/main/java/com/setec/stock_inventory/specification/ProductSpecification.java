package com.setec.stock_inventory.specification;

import com.setec.stock_inventory.entity.Brand;
import com.setec.stock_inventory.entity.Product;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

public class ProductSpecification {

    public static Specification<Product> filterCatalog(
            String search,
            Long categoryId,
            Long brandId,
            String brand,
            Double minPrice,
            Double maxPrice,
            Collection<Long> pendingProductIds
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Always eager fetch category and brand for content queries (avoid N+1)
            if (query != null && Long.class != query.getResultType() && long.class != query.getResultType()) {
                root.fetch("category", JoinType.LEFT);
                root.fetch("brand", JoinType.LEFT);
                query.distinct(true);
            }

            // Always only active products for the storefront catalog
            predicates.add(cb.isTrue(root.get("active")));

            // Storefront catalog visibility:
            // product.stock > 0 OR product is in a PENDING Purchase Order (pendingProductIds)
            Predicate inStock = cb.greaterThan(root.get("stock"), 0);
            if (pendingProductIds != null && !pendingProductIds.isEmpty()) {
                predicates.add(cb.or(inStock, root.get("id").in(pendingProductIds)));
            } else {
                predicates.add(inStock);
            }

            Join<Product, Brand> brandJoin = root.join("brand", JoinType.LEFT);

            // Case-insensitive search across name, description, or brand name
            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("name")), pattern);
                Predicate descMatch = cb.like(cb.lower(cb.coalesce(root.get("description"), "")), pattern);
                Predicate brandMatch = cb.like(cb.lower(cb.coalesce(brandJoin.get("name"), "")), pattern);
                predicates.add(cb.or(nameMatch, descMatch, brandMatch));
            }

            // Category filter
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }

            // Brand filter by brandId (primary) or brand name (fallback)
            if (brandId != null) {
                predicates.add(cb.equal(brandJoin.get("id"), brandId));
            } else if (brand != null && !brand.trim().isEmpty()) {
                predicates.add(cb.equal(cb.lower(cb.coalesce(brandJoin.get("name"), "")), brand.trim().toLowerCase()));
            }

            // Price range filter
            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), minPrice));
            }
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), maxPrice));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<Product> filterCatalog(
            String search,
            Long categoryId,
            Long brandId,
            String brand,
            Double minPrice,
            Double maxPrice
    ) {
        return filterCatalog(search, categoryId, brandId, brand, minPrice, maxPrice, Collections.emptySet());
    }

    public static Specification<Product> filterCatalog(
            String search,
            Long categoryId,
            String brand,
            Double minPrice,
            Double maxPrice
    ) {
        return filterCatalog(search, categoryId, null, brand, minPrice, maxPrice, Collections.emptySet());
    }
}
