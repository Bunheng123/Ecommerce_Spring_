package com.setec.stock_inventory.dto.Request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserRequestDto {
    @Size(min = 2, max = 50, message = "Username must be between 2 and 50 characters")
    private String username;

    private String fullName;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @Size(min = 4, max = 255, message = "Password must be between 4 and 255 characters")
    private String password;

    private String role;

    @Size(max = 20, message = "Phone must be at most 20 characters")
    private String phone;
}