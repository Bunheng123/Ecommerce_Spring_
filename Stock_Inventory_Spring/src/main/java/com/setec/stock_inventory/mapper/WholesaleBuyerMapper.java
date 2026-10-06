package com.setec.stock_inventory.mapper;

import com.setec.stock_inventory.dto.Request.WholesaleBuyerRequestDto;
import com.setec.stock_inventory.dto.Response.WholesaleBuyerResponseDto;
import com.setec.stock_inventory.entity.WholesaleBuyer;

public class WholesaleBuyerMapper {

    public static WholesaleBuyerResponseDto toResponse(WholesaleBuyer buyer) {
        if (buyer == null) {
            return null;
        }

        return WholesaleBuyerResponseDto.builder()
                .id(buyer.getId())
                .type(buyer.getType())
                .name(buyer.getName())
                .contactPerson(buyer.getContactPerson())
                .phone(buyer.getPhone())
                .email(buyer.getEmail())
                .address(buyer.getAddress())
                .active(buyer.isActive())
                .createdAt(buyer.getCreatedAt())
                .updatedAt(buyer.getUpdatedAt())
                .build();
    }

    public static WholesaleBuyer toEntity(WholesaleBuyerRequestDto request) {
        if (request == null) {
            return null;
        }

        return WholesaleBuyer.builder()
                .type(request.getType())
                .name(request.getName())
                .contactPerson(request.getContactPerson())
                .phone(request.getPhone())
                .email(request.getEmail())
                .address(request.getAddress())
                .active(request.getActive() != null ? request.getActive() : true)
                .build();
    }

    public static void updateEntity(WholesaleBuyer buyer, WholesaleBuyerRequestDto request) {
        if (buyer == null || request == null) {
            return;
        }
        if (request.getType() != null) {
            buyer.setType(request.getType());
        }
        buyer.setName(request.getName());
        buyer.setContactPerson(request.getContactPerson());
        buyer.setPhone(request.getPhone());
        buyer.setEmail(request.getEmail());
        buyer.setAddress(request.getAddress());
        if (request.getActive() != null) {
            buyer.setActive(request.getActive());
        }
    }
}
