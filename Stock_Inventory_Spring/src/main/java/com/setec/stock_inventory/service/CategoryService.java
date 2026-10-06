package com.setec.stock_inventory.service;

import java.util.List;

import com.setec.stock_inventory.dto.Request.CategoryRequestDto;
import com.setec.stock_inventory.dto.Response.CategoryResponseDto;

public interface CategoryService {
    CategoryResponseDto createCategory(CategoryRequestDto request);
    List<CategoryResponseDto> getAllCategories();
    CategoryResponseDto getCategoryById(Long id);
    CategoryResponseDto updateCategory(Long id, CategoryRequestDto request);
    void deleteCategory(Long id);
    void forceDeleteCategory(Long id);
}
