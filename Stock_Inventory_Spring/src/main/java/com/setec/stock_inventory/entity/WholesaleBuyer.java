package com.setec.stock_inventory.entity;

import com.setec.stock_inventory.enums.BuyerType;
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
@Table(name = "wholesale_buyers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WholesaleBuyer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BuyerType type;

    @Column(length = 150, nullable = false)
    private String name;

    @Column(name = "contact_person", length = 100)
    private String contactPerson;

    @Column(length = 20)
    private String phone;

    @Column(length = 50)
    private String email;

    @Column(length = 255)
    private String address;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "buyer", fetch = FetchType.LAZY)
    private List<WholesaleOrder> wholesaleOrders;
}
