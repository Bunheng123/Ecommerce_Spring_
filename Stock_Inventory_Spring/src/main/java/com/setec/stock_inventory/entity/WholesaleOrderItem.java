package com.setec.stock_inventory.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "wholesale_order_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WholesaleOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wholesale_order_id", nullable = false)
    private WholesaleOrder wholesaleOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Min(value = 1, message = "quantity must be at least 1")
    @Column(nullable = false)
    private int quantity;

    @Column(name = "wholesale_price", nullable = false)
    private double wholesalePrice;
}
