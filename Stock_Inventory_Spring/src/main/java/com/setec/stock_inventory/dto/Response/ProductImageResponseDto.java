package com.setec.stock_inventory.dto.Response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductImageResponseDto {
    private Long id;
    private Long productId;
    private String imageUrl;
    private String publicId;
    private boolean isPrimary;
    private LocalDateTime createdAt;
}
