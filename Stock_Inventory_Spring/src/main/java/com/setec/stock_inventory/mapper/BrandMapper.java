package com.setec.stock_inventory.mapper;

import com.setec.stock_inventory.dto.Request.BrandRequestDto;
import com.setec.stock_inventory.dto.Response.BrandResponseDto;
import com.setec.stock_inventory.entity.Brand;

public class BrandMapper {

    public static BrandResponseDto toResponse(Brand brand, long productCount) {
        if (brand == null) {
            return null;
        }
        return BrandResponseDto.builder()
                .id(brand.getId())
                .name(brand.getName())
                .description(brand.getDescription())
                .productCount(productCount)
                .createdAt(brand.getCreatedAt())
                .updatedAt(brand.getUpdatedAt())
                .build();
    }

    public static BrandResponseDto toResponse(Brand brand) {
        if (brand == null) {
            return null;
        }
        long count = brand.getProducts() != null ? brand.getProducts().size() : 0L;
        return toResponse(brand, count);
    }

    public static Brand toEntity(BrandRequestDto dto) {
        if (dto == null) {
            return null;
        }
        return Brand.builder()
                .name(dto.getName() != null ? dto.getName().trim() : null)
                .description(dto.getDescription() != null ? dto.getDescription().trim() : null)
                .build();
    }

    public static void updateEntity(Brand brand, BrandRequestDto dto) {
        if (brand == null || dto == null) {
            return;
        }
        brand.setName(dto.getName() != null ? dto.getName().trim() : brand.getName());
        brand.setDescription(dto.getDescription() != null ? dto.getDescription().trim() : null);
    }
}
