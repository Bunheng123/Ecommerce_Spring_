package com.setec.stock_inventory.controller;

import com.setec.stock_inventory.dto.ApiResponse;
import com.setec.stock_inventory.dto.Request.CategoryRequestDto;
import com.setec.stock_inventory.dto.Response.CategoryResponseDto;
import com.setec.stock_inventory.service.CategoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {
    private final CategoryService   service;


    public CategoryController(CategoryService categoryService) {
        this.service = categoryService;
    }

    // GET all categories: http://localhost:9090/api/categories
    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryResponseDto>>> getAllCategories() {
        return new ResponseEntity<>(
                ApiResponse.success(
                        "Get Category successfully",
                        service.getAllCategories()),
                        HttpStatus.OK
                    );
    }

    // GET category by ID: http://localhost:9090/api/categories/{id}
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponseDto>> getCategoryById(@PathVariable Long id) {
        CategoryResponseDto category = service.getCategoryById(id);
        return new ResponseEntity<>(
                ApiResponse.success("Get category successfully", category),
                HttpStatus.OK
        );
    }

    // POST create category: http://localhost:9090/api/categories
    @PostMapping
    public ResponseEntity<ApiResponse<CategoryResponseDto>> addCategory(@Valid @RequestBody CategoryRequestDto categoryRequestDto) {
        CategoryResponseDto categoryResponse = service.createCategory(categoryRequestDto);
        return new ResponseEntity<>(
                ApiResponse.success("Category created successfully", categoryResponse),
                HttpStatus.CREATED
        );
    }

    // PUT update category: http://localhost:9090/api/categories/{id}
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponseDto>> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequestDto categoryRequestDto) {
        CategoryResponseDto updatedCategory = service.updateCategory(id, categoryRequestDto);
        return new ResponseEntity<>(
                ApiResponse.success("Category updated successfully", updatedCategory),
                HttpStatus.OK
        );
    }

    // DELETE category: http://localhost:9090/api/categories/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Long id) {
        service.deleteCategory(id);
        return new ResponseEntity<>(
                ApiResponse.success("Category deleted successfully", null),
                HttpStatus.OK
        );
    }

    @DeleteMapping("/{id}/force")
    public ResponseEntity<ApiResponse<Void>> forceDeleteCategory(@PathVariable Long id) {
        service.forceDeleteCategory(id);
        return new ResponseEntity<>(
                ApiResponse.success("Category and linked products deleted successfully", null),
                HttpStatus.OK
        );
    }
}
