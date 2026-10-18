package com.setec.stock_inventory.controller;

import com.setec.stock_inventory.dto.ApiResponse;
import com.setec.stock_inventory.dto.Request.BrandRequestDto;
import com.setec.stock_inventory.dto.Response.BrandResponseDto;
import com.setec.stock_inventory.service.BrandService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Brand", description = "Brand Management APIs")
@RestController
@RequestMapping("/api/brands")
@RequiredArgsConstructor
public class BrandController {

    private final BrandService brandService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BrandResponseDto>>> getAllBrands() {
        return ResponseEntity.ok(ApiResponse.success("Brands retrieved successfully", brandService.getAllBrands()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BrandResponseDto>> getBrandById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Brand retrieved successfully", brandService.getBrandById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BrandResponseDto>> createBrand(@Valid @RequestBody BrandRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Brand created successfully", brandService.createBrand(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BrandResponseDto>> updateBrand(
            @PathVariable Long id,
            @Valid @RequestBody BrandRequestDto request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Brand updated successfully", brandService.updateBrand(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBrand(@PathVariable Long id) {
        brandService.deleteBrand(id);
        return ResponseEntity.ok(ApiResponse.success("Brand deleted successfully and linked products unlinked", null));
    }
}
