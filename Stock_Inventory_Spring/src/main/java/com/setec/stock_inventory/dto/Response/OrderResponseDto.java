package com.setec.stock_inventory.dto.Response;

import com.setec.stock_inventory.enums.PaymentMethod;
import com.setec.stock_inventory.enums.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponseDto {
    private Long id;
    private LocalDateTime orderDate;
    private BigDecimal subtotal;
    private BigDecimal shippingCost;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private String status;
    private Long userId;
    private String username;
    private String phone;
    private String shippingAddress;
    private PaymentStatus paymentStatus;
    private PaymentMethod paymentMethod;
    private String customerNote;
    private LocalDateTime updateAt;
    private List<OrderItemResponseDto> orderItems;
}
