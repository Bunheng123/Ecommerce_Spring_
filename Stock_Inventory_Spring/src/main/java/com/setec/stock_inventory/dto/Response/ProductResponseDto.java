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
public class ProductResponseDto {
    private Long id;
    private String name;
    private String description;
    private Double price;
    private String imageUrl;
    private String publicId;
    private int stock;
    private boolean active;
    private LocalDateTime deactivatedAt;
    private Double costPrice;
    private int reorderLevel;
    private Long categoryId;
    private String categoryName;
    private java.util.List<String> galleryImageUrls;
}
