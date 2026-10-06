package com.setec.stock_inventory.mapper;

import com.setec.stock_inventory.dto.Request.ProductRequestDto;
import com.setec.stock_inventory.dto.Response.ProductImageResponseDto;
import com.setec.stock_inventory.dto.Response.ProductResponseDto;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.entity.ProductImage;

import java.util.Collections;
import java.util.List;

public class ProductMapper {

    public static ProductResponseDto toResponse(Product product) {
        if (product == null) {
            return null;
        }

        List<String> galleryUrls = product.getGalleryImages() != null
                ? product.getGalleryImages().stream().map(ProductImage::getImageUrl).toList()
                : Collections.emptyList();

        return ProductResponseDto.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .imageUrl(product.getImageUrl())
                .publicId(product.getPublicId())
                .stock(product.getStock())
                .active(product.isActive())
                .deactivatedAt(product.getDeactivatedAt())
                .costPrice(product.getCostPrice())
                .reorderLevel(product.getReorderLevel())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .galleryImageUrls(galleryUrls)
                .build();
    }

    public static ProductImageResponseDto toImageResponse(ProductImage image) {
        if (image == null) {
            return null;
        }

        return ProductImageResponseDto.builder()
                .id(image.getId())
                .productId(image.getProduct() != null ? image.getProduct().getId() : null)
                .imageUrl(image.getImageUrl())
                .publicId(image.getPublicId())
                .isPrimary(image.isPrimary())
                .createdAt(image.getCreatedAt())
                .build();
    }

    public static Product toEntity(ProductRequestDto request){
        if(request == null){
            return null;
        }

        return Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice() != null ? request.getPrice() : 0.0)
                .stock(request.getStock() != null ? request.getStock() : 0)
                .active(true)
                .costPrice(request.getCostPrice())
                .reorderLevel(request.getReorderLevel() != null ? request.getReorderLevel() : 0)
                .build();
    }

}
