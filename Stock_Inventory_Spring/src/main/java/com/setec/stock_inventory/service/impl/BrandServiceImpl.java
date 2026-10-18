package com.setec.stock_inventory.service.impl;

import com.setec.stock_inventory.dto.Request.BrandRequestDto;
import com.setec.stock_inventory.dto.Response.BrandResponseDto;
import com.setec.stock_inventory.entity.Brand;
import com.setec.stock_inventory.exception.BadRequestException;
import com.setec.stock_inventory.exception.ResourceNotFoundException;
import com.setec.stock_inventory.mapper.BrandMapper;
import com.setec.stock_inventory.repo.BrandRepository;
import com.setec.stock_inventory.repo.ProductRepository;
import com.setec.stock_inventory.service.BrandService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BrandServiceImpl implements BrandService {

    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;

    @Override
    @Transactional(readOnly = true)
    public List<BrandResponseDto> getAllBrands() {
        List<Brand> brands = brandRepository.findAllOrderByNameAsc();
        return brands.stream()
                .map(b -> {
                    long count = productRepository.countByBrandId(b.getId());
                    return BrandMapper.toResponse(b, count);
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BrandResponseDto getBrandById(Long id) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + id));
        long count = productRepository.countByBrandId(brand.getId());
        return BrandMapper.toResponse(brand, count);
    }

    @Override
    @Transactional
    public BrandResponseDto createBrand(BrandRequestDto request) {
        String trimmedName = request.getName() != null ? request.getName().trim() : "";
        if (trimmedName.isEmpty()) {
            throw new BadRequestException("Brand name cannot be blank");
        }
        if (brandRepository.existsByNameIgnoreCase(trimmedName)) {
            throw new BadRequestException("Brand with name '" + trimmedName + "' already exists");
        }
        Brand brand = BrandMapper.toEntity(request);
        brand.setName(trimmedName);
        Brand saved = brandRepository.save(brand);
        return BrandMapper.toResponse(saved, 0L);
    }

    @Override
    @Transactional
    public BrandResponseDto updateBrand(Long id, BrandRequestDto request) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + id));

        String trimmedName = request.getName() != null ? request.getName().trim() : "";
        if (trimmedName.isEmpty()) {
            throw new BadRequestException("Brand name cannot be blank");
        }
        if (brandRepository.existsByNameIgnoreCaseAndIdNot(trimmedName, id)) {
            throw new BadRequestException("Brand with name '" + trimmedName + "' already exists");
        }

        BrandMapper.updateEntity(brand, request);
        brand.setName(trimmedName);
        Brand updated = brandRepository.save(brand);
        long count = productRepository.countByBrandId(updated.getId());
        return BrandMapper.toResponse(updated, count);
    }

    @Override
    @Transactional
    public void deleteBrand(Long id) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + id));

        // Safely unlink any associated products
        productRepository.unlinkBrandFromProducts(id);

        brandRepository.delete(brand);
    }
}
