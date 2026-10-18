package com.setec.stock_inventory.service;

import com.setec.stock_inventory.dto.Request.BrandRequestDto;
import com.setec.stock_inventory.dto.Response.BrandResponseDto;

import java.util.List;

public interface BrandService {
    List<BrandResponseDto> getAllBrands();
    BrandResponseDto getBrandById(Long id);
    BrandResponseDto createBrand(BrandRequestDto request);
    BrandResponseDto updateBrand(Long id, BrandRequestDto request);
    void deleteBrand(Long id);
}
