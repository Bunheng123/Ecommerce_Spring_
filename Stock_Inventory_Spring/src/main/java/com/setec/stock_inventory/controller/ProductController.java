package com.setec.stock_inventory.controller;

import com.setec.stock_inventory.dto.ApiResponse;
import com.setec.stock_inventory.dto.Request.ProductRequestDto;
import com.setec.stock_inventory.dto.Request.StockAdjustmentRequestDto;
import com.setec.stock_inventory.dto.Response.ProductImageResponseDto;
import com.setec.stock_inventory.dto.Response.ProductResponseDto;
import com.setec.stock_inventory.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;

@Tag(name = "Product", description = "Product Management APIs")
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ProductResponseDto>> createProduct(
            @Valid @ModelAttribute ProductRequestDto request) {
        ProductResponseDto response = productService.createProduct(request);
        return new ResponseEntity<>(
                ApiResponse.success("Product created successfully", response),
                HttpStatus.CREATED
        );
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'STOCK')")
    public ResponseEntity<ApiResponse<List<ProductResponseDto>>> getLowStockProducts() {
        List<ProductResponseDto> products = productService.getLowStockProducts();
        return ResponseEntity.ok(ApiResponse.success("Low stock products retrieved successfully", products));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAnyRole('ADMIN', 'STOCK')")
    public ResponseEntity<ApiResponse<List<ProductResponseDto>>> getAllProductsForAdmin() {
        List<ProductResponseDto> products = productService.getAllProductsForAdmin();
        return ResponseEntity.ok(ApiResponse.success("Admin products retrieved successfully", products));
    }

    @PostMapping("/{id}/adjust-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'STOCK')")
    public ResponseEntity<ApiResponse<ProductResponseDto>> adjustStock(
            @PathVariable Long id,
            @Valid @RequestBody StockAdjustmentRequestDto request) {
        ProductResponseDto response = productService.adjustStock(id, request);
        return ResponseEntity.ok(ApiResponse.success("Stock adjusted successfully", response));
    }

    @PostMapping("/{id}/stock-in")
    @PreAuthorize("hasAnyRole('ADMIN', 'STOCK')")
    public ResponseEntity<ApiResponse<ProductResponseDto>> stockIn(
            @PathVariable Long id,
            @Valid @RequestBody StockAdjustmentRequestDto request) {
        ProductResponseDto response = productService.stockIn(id, request);
        return ResponseEntity.ok(ApiResponse.success("Stock added successfully", response));
    }

    @PostMapping("/{id}/stock-out")
    @PreAuthorize("hasAnyRole('ADMIN', 'STOCK')")
    public ResponseEntity<ApiResponse<ProductResponseDto>> stockOut(
            @PathVariable Long id,
            @Valid @RequestBody StockAdjustmentRequestDto request) {
        ProductResponseDto response = productService.stockOut(id, request);
        return ResponseEntity.ok(ApiResponse.success("Stock reduced successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponseDto>> getProductById(@PathVariable Long id) {
        ProductResponseDto response = productService.getProductById(id);
        return ResponseEntity.ok(ApiResponse.success("Product retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductResponseDto>>> getAllProducts() {
        List<ProductResponseDto> products = productService.getAllProducts();
        return ResponseEntity.ok(ApiResponse.success("Products retrieved successfully", products));
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<ApiResponse<List<ProductResponseDto>>> getProductsByCategoryId(
            @PathVariable Long categoryId) {
        List<ProductResponseDto> products = productService.getProductsByCategoryId(categoryId);
        return ResponseEntity.ok(ApiResponse.success("Products retrieved successfully for category", products));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ProductResponseDto>> updateProduct(
            @PathVariable Long id,
            @Valid @ModelAttribute ProductRequestDto request) {
        ProductResponseDto response = productService.updateProduct(id, request);
        return ResponseEntity.ok(ApiResponse.success("Product updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Product deleted successfully", null));
    }

    @DeleteMapping("/{id}/hard")
    @PreAuthorize("hasAnyRole('ADMIN', 'STOCK')")
    public ResponseEntity<ApiResponse<Void>> hardDeleteProduct(@PathVariable Long id) {
        productService.hardDeleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Product permanently deleted successfully", null));
    }

    @RequestMapping(value = "/{id}/activate", method = {RequestMethod.PATCH, RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasAnyRole('ADMIN', 'STOCK')")
    public ResponseEntity<ApiResponse<Void>> activateProduct(@PathVariable Long id) {
        productService.activateProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Product activated successfully", null));
    }

    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ProductImageResponseDto>> addProductImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        ProductImageResponseDto response = productService.addProductImage(id, file);
        return new ResponseEntity<>(
                ApiResponse.success("Product image uploaded successfully", response),
                HttpStatus.CREATED
        );
    }

    @DeleteMapping("/{id}/images/{imageId}")
    public ResponseEntity<ApiResponse<Void>> deleteProductImage(
            @PathVariable Long id,
            @PathVariable Long imageId) {
        productService.deleteProductImage(id, imageId);
        return ResponseEntity.ok(ApiResponse.success("Product image deleted successfully", null));
    }

    @GetMapping("/{id}/images")
    public ResponseEntity<ApiResponse<List<ProductImageResponseDto>>> getProductImages(
            @PathVariable Long id) {
        List<ProductImageResponseDto> response = productService.getProductImages(id);
        return ResponseEntity.ok(ApiResponse.success("Product images retrieved successfully", response));
    }
}

