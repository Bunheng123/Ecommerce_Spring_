package com.setec.stock_inventory.dto.Request;

import com.setec.stock_inventory.enums.PaymentMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutRequestDto {

    @NotBlank(message = "Shipping address is required")
    @Size(max = 255, message = "Shipping address must be less than 255 characters")
    private String shippingAddress;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    @Size(max = 500, message = "Customer note must be less than 500 characters")
    private String customerNote;
}
