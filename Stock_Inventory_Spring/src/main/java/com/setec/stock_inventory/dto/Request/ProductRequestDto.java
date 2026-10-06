package com.setec.stock_inventory.dto.Request;

import jakarta.validation.constraints.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder

public class ProductRequestDto {

    @NotBlank(message = "Product name is required")
    @Size(max = 100 , message = "Product name must be less than 100 characters")
    private String name;

    @Size(max = 1000 , message = "description must be less than 1000 characters")
    private String description;

    @NotNull(message = "Product price is required")
    @Min(value = 0, message = "Price must be non-negative")
    private Double price;

    @NotNull(message = "Stock is required")
    @Min(value = 0, message = "Stock cannot be negative")
    private Integer stock;

    @Min(value = 0, message = "Cost price must be non-negative")
    private Double costPrice;

    @Min(value = 0, message = "Reorder level cannot be negative")
    private Integer reorderLevel;

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    private MultipartFile file;


}
