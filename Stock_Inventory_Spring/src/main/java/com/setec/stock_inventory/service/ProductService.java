package com.setec.stock_inventory.service;

import com.setec.stock_inventory.dto.Request.ProductRequestDto;
import com.setec.stock_inventory.dto.Request.StockAdjustmentRequestDto;
import com.setec.stock_inventory.dto.Response.ProductImageResponseDto;
import com.setec.stock_inventory.dto.Response.ProductResponseDto;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ProductService {
    
    ProductResponseDto createProduct(ProductRequestDto request);

    List<ProductResponseDto> getAllProducts();

    List<ProductResponseDto> getAllProductsForAdmin();

    ProductResponseDto getProductById(Long id);

    List<ProductResponseDto> getProductsByCategoryId(Long categoryId);

    ProductResponseDto updateProduct(Long id, ProductRequestDto request);

    void deleteProduct(Long id);

    void activateProduct(Long id);

    void hardDeleteProduct(Long id);

    List<ProductResponseDto> getLowStockProducts();

    ProductResponseDto adjustStock(Long id, StockAdjustmentRequestDto request);

    ProductResponseDto stockIn(Long id, StockAdjustmentRequestDto request);

    ProductResponseDto stockOut(Long id, StockAdjustmentRequestDto request);

    ProductImageResponseDto addProductImage(Long productId, MultipartFile file);

    void deleteProductImage(Long productId, Long imageId);

    List<ProductImageResponseDto> getProductImages(Long productId);
}
