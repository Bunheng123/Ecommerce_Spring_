package com.setec.stock_inventory.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Size(min = 2, max = 100)
    private String name;

    private String description;

    private double price;

    private String imageUrl;

    private String publicId;

    @Min(value = 0, message = "stock cannot be negative")
    private int stock;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean active = true;

    private LocalDateTime deactivatedAt;

    @Column(name = "cost_price")
    private Double costPrice;

    @Builder.Default
    @Column(name = "reorder_level", nullable = false, columnDefinition = "int default 0")
    private int reorderLevel = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id" , nullable = false)
    private Category category;

    @OneToMany(mappedBy = "product")
    private List<OrderItem> orders;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ProductImage> galleryImages;
}
