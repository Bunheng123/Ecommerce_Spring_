package com.setec.stock_inventory.service.impl;

import java.util.List;
import java.util.Collections;

import org.springframework.stereotype.Service;

import com.setec.stock_inventory.dto.Request.CategoryRequestDto;
import com.setec.stock_inventory.dto.Response.CategoryResponseDto;
import com.setec.stock_inventory.entity.Category;
import com.setec.stock_inventory.exception.BadRequestException;
import com.setec.stock_inventory.exception.ResourceNotFoundException;
import com.setec.stock_inventory.mapper.CategoryMapper;
import com.setec.stock_inventory.repo.CartItemRepository;
import com.setec.stock_inventory.repo.CategoryRepository;
import com.setec.stock_inventory.repo.OrderItemRepository;
import com.setec.stock_inventory.repo.ProductImageRepository;
import com.setec.stock_inventory.repo.ProductRepository;
import com.setec.stock_inventory.repo.StockMovementRepository;
import com.setec.stock_inventory.service.CategoryService;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor; 

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryMapper categoryMapper;
    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final CartItemRepository cartItemRepository;
    private final OrderItemRepository orderItemRepository;
    private final StockMovementRepository stockMovementRepository;



    @Override
    public CategoryResponseDto createCategory(CategoryRequestDto request) {
        if (categoryRepository.existsByName(request.getName())) {
            throw new BadRequestException("Category with name '" + request.getName() + "' already exists");
        }
        Category category = categoryMapper.toEntity(request);
        Category saved = categoryRepository.save(category);
        return categoryMapper.toResponse(saved);
    }

    @Override
    public List<CategoryResponseDto> getAllCategories() {
        List<Category> categories = categoryRepository.findAll();
        if (categories.isEmpty()) {
            throw new ResourceNotFoundException("Category not found");
        }

        return categories.stream()
                .map(category -> categoryMapper.toResponse(category))
                .toList();
    }

    @Override
    public CategoryResponseDto getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
        return categoryMapper.toResponse(category);
    }

    @Override
    public CategoryResponseDto updateCategory(Long id, CategoryRequestDto request) {
        // 1. Find existing category or throw 404
        Category existingCategory = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));

        // 2. Validate uniqueness: ensure no OTHER category has the new name
        if (categoryRepository.existsByNameAndIdNot(request.getName(), id)) {
            throw new BadRequestException("Category with name '" + request.getName() + "' already exists");
        }

        // 3. Update entity fields using mapper
        categoryMapper.updateEntity(existingCategory, request);

        // 4. Save and return updated response
        Category updatedCategory = categoryRepository.save(existingCategory);
        return categoryMapper.toResponse(updatedCategory);
    }

    @Override
    public void deleteCategory(Long id) {
        // 1. Verify the category exists before trying to delete
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));

        // 2. Safeguard: Prevent deleting a category if it still has linked products
        if (category.getProducts() != null && !category.getProducts().isEmpty()) {
            throw new BadRequestException("Cannot delete category with id " + id + " because it still has associated products");
        }

        // 3. Delete from database
        categoryRepository.delete(category);
    }

    @Override
    @Transactional
    public void forceDeleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));

        List<com.setec.stock_inventory.entity.Product> products =
                category.getProducts() != null ? category.getProducts() : Collections.emptyList();

        products.forEach(product -> {
                Long productId = product.getId();
                cartItemRepository.deleteByProductId(productId);
                orderItemRepository.deleteByProductId(productId);
                stockMovementRepository.deleteByProductId(productId);
                productImageRepository.deleteByProductId(productId);
        });

        productRepository.deleteAll(products);
        categoryRepository.delete(category);
    }
}

