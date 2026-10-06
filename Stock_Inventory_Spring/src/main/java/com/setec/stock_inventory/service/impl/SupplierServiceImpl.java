package com.setec.stock_inventory.service.impl;

import com.setec.stock_inventory.dto.Request.SupplierRequestDto;
import com.setec.stock_inventory.dto.Response.SupplierResponseDto;
import com.setec.stock_inventory.entity.PurchaseOrder;
import com.setec.stock_inventory.entity.Supplier;
import com.setec.stock_inventory.exception.BadRequestException;
import com.setec.stock_inventory.exception.ResourceNotFoundException;
import com.setec.stock_inventory.mapper.SupplierMapper;
import com.setec.stock_inventory.repo.PurchaseOrderRepository;
import com.setec.stock_inventory.repo.SupplierRepository;
import com.setec.stock_inventory.service.SupplierService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SupplierServiceImpl implements SupplierService {

    private final SupplierRepository supplierRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;

    @Override
    @Transactional
    public SupplierResponseDto createSupplier(SupplierRequestDto request) {
        if (supplierRepository.existsByName(request.getName())) {
            throw new BadRequestException("Supplier name already exists: " + request.getName());
        }

        Supplier supplier = SupplierMapper.toEntity(request);
        Supplier saved = supplierRepository.save(supplier);
        return SupplierMapper.toResponse(saved);
    }

    @Override
    public List<SupplierResponseDto> getAllSuppliers() {
        return supplierRepository.findAll().stream()
                .map(SupplierMapper::toResponse)
                .toList();
    }

    @Override
    public SupplierResponseDto getSupplierById(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find supplier with id: " + id));
        return SupplierMapper.toResponse(supplier);
    }

    @Override
    @Transactional
    public SupplierResponseDto updateSupplier(Long id, SupplierRequestDto request) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find supplier with id: " + id));

        if (supplierRepository.existsByNameAndIdNot(request.getName(), id)) {
            throw new BadRequestException("Supplier name already exists: " + request.getName());
        }

        SupplierMapper.updateEntity(supplier, request);
        Supplier updated = supplierRepository.save(supplier);
        return SupplierMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public void deleteSupplier(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find supplier with id: " + id));

        List<PurchaseOrder> orders = purchaseOrderRepository.findBySupplierId(id);
        if (!orders.isEmpty()) {
            supplier.setActive(false);
            supplierRepository.save(supplier);
        } else {
            supplierRepository.delete(supplier);
        }
    }
}
