package com.setec.stock_inventory.dto.Request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class OrderStatusRequestDto {

    @NotBlank(message = "Status is required")
    private String status;
}
