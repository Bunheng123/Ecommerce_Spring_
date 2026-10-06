package com.setec.stock_inventory.controller;

import com.setec.stock_inventory.dto.ApiResponse;
import com.setec.stock_inventory.dto.Request.WholesaleBuyerRequestDto;
import com.setec.stock_inventory.dto.Response.WholesaleBuyerResponseDto;
import com.setec.stock_inventory.service.WholesaleBuyerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wholesale-buyers")
@RequiredArgsConstructor
public class WholesaleBuyerController {

    private final WholesaleBuyerService wholesaleBuyerService;

    @PostMapping
    public ResponseEntity<ApiResponse<WholesaleBuyerResponseDto>> createWholesaleBuyer(
            @Valid @RequestBody WholesaleBuyerRequestDto request) {
        WholesaleBuyerResponseDto response = wholesaleBuyerService.createWholesaleBuyer(request);
        return new ResponseEntity<>(
                ApiResponse.success("Wholesale buyer created successfully", response),
                HttpStatus.CREATED
        );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<WholesaleBuyerResponseDto>>> getAllWholesaleBuyers() {
        List<WholesaleBuyerResponseDto> response = wholesaleBuyerService.getAllWholesaleBuyers();
        return ResponseEntity.ok(ApiResponse.success("Wholesale buyers retrieved successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WholesaleBuyerResponseDto>> getWholesaleBuyerById(@PathVariable Long id) {
        WholesaleBuyerResponseDto response = wholesaleBuyerService.getWholesaleBuyerById(id);
        return ResponseEntity.ok(ApiResponse.success("Wholesale buyer retrieved successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<WholesaleBuyerResponseDto>> updateWholesaleBuyer(
            @PathVariable Long id,
            @Valid @RequestBody WholesaleBuyerRequestDto request) {
        WholesaleBuyerResponseDto response = wholesaleBuyerService.updateWholesaleBuyer(id, request);
        return ResponseEntity.ok(ApiResponse.success("Wholesale buyer updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteWholesaleBuyer(@PathVariable Long id) {
        wholesaleBuyerService.deleteWholesaleBuyer(id);
        return ResponseEntity.ok(ApiResponse.success("Wholesale buyer deleted successfully", null));
    }
}
