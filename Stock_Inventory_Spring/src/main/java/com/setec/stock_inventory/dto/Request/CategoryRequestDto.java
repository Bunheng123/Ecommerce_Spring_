package com.setec.stock_inventory.dto.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CategoryRequestDto {
    @NotNull(message = "name must not be null")
    @Size(max=50, message="Category name must be at most 50 characters")
    private String name;

    @Size(min = 2, max=1000, message="Category description must be between 2 to 1000 characters")
    private String description;
}
