package com.setec.stock_inventory.dto.email;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderEmailPayload {
    private Long orderId;
    private String recipientEmail;
    private String customerName;
    private String username;
    private String phone;
    private String shippingAddress;
    private String paymentMethod;
    private BigDecimal subtotal;
    private BigDecimal shippingCost;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private String orderDate;
    private List<OrderEmailItemDto> items;
    private boolean refunded;
    private BigDecimal refundAmount;
    private String paymentStatus;
}
