package com.setec.stock_inventory.entity;

import com.setec.stock_inventory.enums.WholesaleOrderStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "wholesale_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WholesaleOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private WholesaleBuyer buyer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private WholesaleOrderStatus status = WholesaleOrderStatus.PENDING;

    private double totalAmount;

    @CreationTimestamp
    private LocalDateTime orderDate;

    @UpdateTimestamp
    private LocalDateTime updateDate;

    @OneToMany(mappedBy = "wholesaleOrder", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<WholesaleOrderItem> items;
}
