package com.setec.stock_inventory.controller;

import com.setec.stock_inventory.dto.ApiResponse;
import com.setec.stock_inventory.dto.Request.SupplierRequestDto;
import com.setec.stock_inventory.dto.Response.SupplierResponseDto;
import com.setec.stock_inventory.service.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    @PostMapping
    public ResponseEntity<ApiResponse<SupplierResponseDto>> createSupplier(
            @Valid @RequestBody SupplierRequestDto request) {
        SupplierResponseDto response = supplierService.createSupplier(request);
        return new ResponseEntity<>(
                ApiResponse.success("Supplier created successfully", response),
                HttpStatus.CREATED
        );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SupplierResponseDto>>> getAllSuppliers() {
        List<SupplierResponseDto> response = supplierService.getAllSuppliers();
        return ResponseEntity.ok(ApiResponse.success("Suppliers retrieved successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SupplierResponseDto>> getSupplierById(@PathVariable Long id) {
        SupplierResponseDto response = supplierService.getSupplierById(id);
        return ResponseEntity.ok(ApiResponse.success("Supplier retrieved successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SupplierResponseDto>> updateSupplier(
            @PathVariable Long id,
            @Valid @RequestBody SupplierRequestDto request) {
        SupplierResponseDto response = supplierService.updateSupplier(id, request);
        return ResponseEntity.ok(ApiResponse.success("Supplier updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSupplier(@PathVariable Long id) {
        supplierService.deleteSupplier(id);
        return ResponseEntity.ok(ApiResponse.success("Supplier deleted successfully", null));
    }
}
