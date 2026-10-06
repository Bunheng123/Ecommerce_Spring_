package com.setec.stock_inventory.entity;


import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "order_items")
@AllArgsConstructor
@NoArgsConstructor
@Data
public class OrderItem {

    @Id
    @GeneratedValue (strategy = GenerationType.IDENTITY)
    private Long id;

    @Min(value = 1,message = "Qty must be at least 1")
    private int quantity;

    @Column(nullable = false)
    private double price;

    @ManyToOne
    @JoinColumn(name="order_id",nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id",nullable = false)
    private Product product;


}
