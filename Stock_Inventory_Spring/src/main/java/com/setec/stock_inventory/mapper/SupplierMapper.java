package com.setec.stock_inventory.mapper;

import com.setec.stock_inventory.dto.Request.SupplierRequestDto;
import com.setec.stock_inventory.dto.Response.SupplierResponseDto;
import com.setec.stock_inventory.entity.Supplier;

public class SupplierMapper {

    public static SupplierResponseDto toResponse(Supplier supplier) {
        if (supplier == null) {
            return null;
        }

        return SupplierResponseDto.builder()
                .id(supplier.getId())
                .name(supplier.getName())
                .contactPerson(supplier.getContactPerson())
                .phone(supplier.getPhone())
                .email(supplier.getEmail())
                .address(supplier.getAddress())
                .active(supplier.isActive())
                .createdAt(supplier.getCreatedAt())
                .updatedAt(supplier.getUpdatedAt())
                .build();
    }

    public static Supplier toEntity(SupplierRequestDto request) {
        if (request == null) {
            return null;
        }

        return Supplier.builder()
                .name(request.getName())
                .contactPerson(request.getContactPerson())
                .phone(request.getPhone())
                .email(request.getEmail())
                .address(request.getAddress())
                .active(request.getActive() != null ? request.getActive() : true)
                .build();
    }

    public static void updateEntity(Supplier supplier, SupplierRequestDto request) {
        if (supplier == null || request == null) {
            return;
        }
        supplier.setName(request.getName());
        supplier.setContactPerson(request.getContactPerson());
        supplier.setPhone(request.getPhone());
        supplier.setEmail(request.getEmail());
        supplier.setAddress(request.getAddress());
        if (request.getActive() != null) {
            supplier.setActive(request.getActive());
        }
    }
}
