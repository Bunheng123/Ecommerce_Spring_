package com.setec.stock_inventory.service;

import com.setec.stock_inventory.dto.Request.SupplierRequestDto;
import com.setec.stock_inventory.dto.Response.SupplierResponseDto;

import java.util.List;

public interface SupplierService {

    SupplierResponseDto createSupplier(SupplierRequestDto request);

    List<SupplierResponseDto> getAllSuppliers();

    SupplierResponseDto getSupplierById(Long id);

    SupplierResponseDto updateSupplier(Long id, SupplierRequestDto request);

    void deleteSupplier(Long id);
}
