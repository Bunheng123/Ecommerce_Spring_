package com.setec.stock_inventory.dto.Request;

import com.setec.stock_inventory.enums.PaymentStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentStatusRequestDto {

    @NotNull(message = "Payment status is required (UNPAID, PAID, REFUNDED)")
    private PaymentStatus paymentStatus;
}
