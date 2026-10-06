package com.setec.stock_inventory.dto.Response;

import com.setec.stock_inventory.enums.BuyerType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WholesaleBuyerResponseDto {
    private Long id;
    private BuyerType type;
    private String name;
    private String contactPerson;
    private String phone;
    private String email;
    private String address;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
