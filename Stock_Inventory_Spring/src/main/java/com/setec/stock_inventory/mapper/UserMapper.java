package com.setec.stock_inventory.mapper;

import com.setec.stock_inventory.dto.Request.UserRequestDto;
import com.setec.stock_inventory.dto.Response.UserResponseDto;
import com.setec.stock_inventory.entity.User;
import com.setec.stock_inventory.enums.Role;
import com.setec.stock_inventory.exception.BadRequestException;

public class UserMapper {

    public static UserResponseDto toResponse(User user) {
        if (user == null) {
            return null;
        }

        return UserResponseDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .fullName(user.getFullName())
                .profileImageUrl(user.getProfileImageUrl())
                .profilePublicId(user.getProfilePublicId())
                .phone(user.getPhone())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    public static User toEntity(UserRequestDto request) {
        if (request == null) {
            return null;
        }

        Role role = Role.USER;
        if (request.getRole() != null && !request.getRole().isBlank()) {
            try {
                role = Role.valueOf(request.getRole().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid role: " + request.getRole() + ". Must be ADMIN, STOCK, or USER");
            }
        }

        return User.builder()
                .username(request.getUsername())
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(request.getPassword())
                .role(role)
                .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                .build();
    }
}
