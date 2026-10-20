package com.setec.stock_inventory.service.impl;

import com.setec.stock_inventory.config.CloudinaryService;
import com.setec.stock_inventory.dto.Request.ProductRequestDto;
import com.setec.stock_inventory.dto.Request.StockAdjustmentRequestDto;
import com.setec.stock_inventory.dto.Response.ProductImageResponseDto;
import com.setec.stock_inventory.dto.Response.ProductResponseDto;
import com.setec.stock_inventory.entity.Brand;
import com.setec.stock_inventory.entity.Category;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.entity.ProductImage;
import com.setec.stock_inventory.entity.StockMovement;
import com.setec.stock_inventory.entity.User;
import com.setec.stock_inventory.enums.MovementType;
import com.setec.stock_inventory.exception.BadRequestException;
import com.setec.stock_inventory.exception.ResourceNotFoundException;
import com.setec.stock_inventory.mapper.ProductMapper;
import com.setec.stock_inventory.repo.CategoryRepository;
import com.setec.stock_inventory.repo.ProductImageRepository;
import com.setec.stock_inventory.repo.ProductRepository;
import com.setec.stock_inventory.repo.StockMovementRepository;
import com.setec.stock_inventory.repo.UserRepository;
import com.setec.stock_inventory.dto.email.StockAlertEmailPayload;
import com.setec.stock_inventory.service.EmailService;
import com.setec.stock_inventory.service.ProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import com.setec.stock_inventory.dto.Response.PageResponseDto;
import com.setec.stock_inventory.specification.ProductSpecification;

import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final com.setec.stock_inventory.repo.BrandRepository brandRepository;
    private final CloudinaryService cloudinaryService;
    private final StockMovementRepository stockMovementRepository;
    private final UserRepository userRepository;
    private final ProductImageRepository productImageRepository;
    private final com.setec.stock_inventory.repo.CartItemRepository cartItemRepository;
    private final com.setec.stock_inventory.repo.OrderItemRepository orderItemRepository;
    private final com.setec.stock_inventory.repo.PurchaseOrderRepository purchaseOrderRepository;
    private final EmailService emailService;

    private ProductResponseDto mapToResponseWithComingSoon(Product product, java.util.Set<Long> pendingProductIds) {
        ProductResponseDto dto = ProductMapper.toResponse(product);
        if (dto != null) {
            boolean comingSoon = dto.getStock() <= 0 && pendingProductIds != null && pendingProductIds.contains(dto.getId());
            dto.setComingSoon(comingSoon);
        }
        return dto;
    }

    private ProductResponseDto enrichComingSoon(ProductResponseDto dto) {
        if (dto != null) {
            boolean comingSoon = dto.getStock() <= 0 && purchaseOrderRepository.isProductInPendingPurchaseOrder(dto.getId());
            dto.setComingSoon(comingSoon);
        }
        return dto;
    }

    @Override
    public ProductResponseDto createProduct(ProductRequestDto request) {
         Category category = categoryRepository.findById(request.getCategoryId()).orElseThrow(
                () -> new ResourceNotFoundException("Category not found with id " + request.getCategoryId())
        );

        String imageUrl = null;
        String publicId = null;

        if (request.getFile() != null && !request.getFile().isEmpty()) {
            Map image = cloudinaryService.uploadFile(request.getFile());
            imageUrl = (String) image.get("url");
            publicId = (String) image.get("public_id");
        }

        Brand brand = null;
        if (request.getBrandId() != null) {
            brand = brandRepository.findById(request.getBrandId()).orElseThrow(
                    () -> new ResourceNotFoundException("Brand not found with id " + request.getBrandId())
            );
        }

        Product product = ProductMapper.toEntity(request);
        product.setCategory(category);
        product.setBrand(brand);
        product.setImageUrl(imageUrl);
        product.setPublicId(publicId);

        Product saved = productRepository.save(product);
        return enrichComingSoon(ProductMapper.toResponse(saved));
    }

    @Override
    public List<ProductResponseDto> getAllProducts() {
        java.util.Set<Long> pendingProductIds = purchaseOrderRepository.findProductIdsInPendingPurchaseOrders();
        return productRepository.findAllWithDetails().stream()
                .map(p -> mapToResponseWithComingSoon(p, pendingProductIds))
                .toList();
    }

    @Override
    public List<ProductResponseDto> getAllProductsForAdmin() {
        java.util.Set<Long> pendingProductIds = purchaseOrderRepository.findProductIdsInPendingPurchaseOrders();
        return productRepository.findAllIncludingInactiveWithDetails().stream()
                .map(p -> mapToResponseWithComingSoon(p, pendingProductIds))
                .toList();
    }

    @Override
    public ProductResponseDto getProductById(Long id) {
        Product product = productRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Product not found with id " + id)
        );
        ProductResponseDto response = enrichComingSoon(ProductMapper.toResponse(product));
        List<ProductImage> galleryImages = productImageRepository.findByProductId(id);
        response.setGalleryImageUrls(galleryImages.stream().map(ProductImage::getImageUrl).toList());
        return response;
    }

    @Override
    public List<ProductResponseDto> getProductsByCategoryId(Long categoryId) {
        if (!categoryRepository.existsById(categoryId)) {
            throw new ResourceNotFoundException("Category not found with id " + categoryId);
        }
        java.util.Set<Long> pendingProductIds = purchaseOrderRepository.findProductIdsInPendingPurchaseOrders();
        return productRepository.findByCategoryIdAndActiveTrue(categoryId).stream()
                .map(p -> mapToResponseWithComingSoon(p, pendingProductIds))
                .toList();
    }

    @Override
    public ProductResponseDto updateProduct(Long id, ProductRequestDto request) {
        Product product = productRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Product not found with id " + id)
        );

        Category category = categoryRepository.findById(request.getCategoryId()).orElseThrow(
                () -> new ResourceNotFoundException("Category not found with id " + request.getCategoryId())
        );

        Brand brand = null;
        if (request.getBrandId() != null) {
            brand = brandRepository.findById(request.getBrandId()).orElseThrow(
                    () -> new ResourceNotFoundException("Brand not found with id " + request.getBrandId())
            );
        }

        product.setName(request.getName());
        product.setBrand(brand);
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setCategory(category);

        if (request.getCostPrice() != null) {
            product.setCostPrice(request.getCostPrice());
        }
        if (request.getReorderLevel() != null) {
            product.setReorderLevel(request.getReorderLevel());
        }

        if (request.getFile() != null && !request.getFile().isEmpty()) {
            if (product.getPublicId() != null) {
                cloudinaryService.deleteFile(product.getPublicId());
            }
            Map<?, ?> image = cloudinaryService.uploadFile(request.getFile());
            product.setImageUrl((String) image.get("url"));
            product.setPublicId((String) image.get("public_id"));
        }

        Product updated = productRepository.save(product);
        return enrichComingSoon(ProductMapper.toResponse(updated));
    }

    @Override
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Product not found with id " + id)
        );

        product.setActive(false);
        product.setDeactivatedAt(LocalDateTime.now());
        productRepository.save(product);
    }

    @Override
    public void activateProduct(Long id) {
        Product product = productRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Product not found with id " + id)
        );

        product.setActive(true);
        product.setDeactivatedAt(null);
        productRepository.save(product);
    }

    @Override
    @Transactional
    public void hardDeleteProduct(Long id) {
        Product product = productRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Product not found with id " + id)
        );

        cartItemRepository.deleteByProductId(id);
        orderItemRepository.deleteByProductId(id);
        stockMovementRepository.deleteByProductId(id);
        productImageRepository.deleteByProductId(id);
        productRepository.delete(product);
    }

    @Override
    public List<ProductResponseDto> getLowStockProducts() {
        java.util.Set<Long> pendingProductIds = purchaseOrderRepository.findProductIdsInPendingPurchaseOrders();
        return productRepository.findLowStockProducts().stream()
                .map(p -> mapToResponseWithComingSoon(p, pendingProductIds))
                .toList();
    }

    @Override
    @Transactional
    public ProductResponseDto adjustStock(Long id, StockAdjustmentRequestDto request) {
        if (request.getType() == MovementType.STOCK_IN) {
            return stockIn(id, request);
        }
        if (request.getType() == MovementType.STOCK_OUT) {
            return stockOut(id, request);
        }

        if (request.getQuantity() == 0) {
            throw new BadRequestException("Adjustment quantity cannot be zero");
        }

        Product product = productRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Product not found with id " + id)
        );

        int previousStock = product.getStock();
        int newStock = previousStock + request.getQuantity();

        if (newStock < 0) {
            throw new BadRequestException("Insufficient stock. Resulting stock cannot be negative. Current stock: "
                    + previousStock + ", Adjustment: " + request.getQuantity());
        }

        product.setStock(newStock);
        Product updated = productRepository.save(product);

        User currentUser = getCurrentAuthenticatedUser();

        StockMovement movement = StockMovement.builder()
                .product(updated)
                .type(MovementType.ADJUSTMENT)
                .quantity(Math.abs(request.getQuantity()))
                .previousStock(previousStock)
                .newStock(newStock)
                .reason(request.getReason())
                .user(currentUser)
                .build();

        stockMovementRepository.save(movement);

        if (request.getQuantity() < 0 && newStock <= updated.getReorderLevel()) {
            String brandName = updated.getBrand() != null ? updated.getBrand().getName() : "N/A";
            String categoryName = updated.getCategory() != null ? updated.getCategory().getName() : "N/A";
            StockAlertEmailPayload alertPayload = StockAlertEmailPayload.builder()
                    .productId(updated.getId())
                    .productName(updated.getName())
                    .brandName(brandName)
                    .categoryName(categoryName)
                    .previousStock(previousStock)
                    .currentStock(newStock)
                    .reorderLevel(updated.getReorderLevel())
                    .triggerSource("Manual Stock Adjustment")
                    .build();
            try {
                emailService.sendAdminStockAlertEmail(alertPayload);
            } catch (Exception e) {
                log.error("Failed to trigger admin stock alert for Product #{}: {}", updated.getId(), e.getMessage());
            }
        }

        return enrichComingSoon(ProductMapper.toResponse(updated));
    }

    @Override
    @Transactional
    public ProductResponseDto stockIn(Long id, StockAdjustmentRequestDto request) {
        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new BadRequestException("Quantity must be greater than zero for stock-in");
        }

        Product product = productRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Product not found with id " + id)
        );

        int previousStock = product.getStock();
        int newStock = previousStock + request.getQuantity();

        product.setStock(newStock);
        Product updated = productRepository.save(product);

        User currentUser = getCurrentAuthenticatedUser();

        StockMovement movement = StockMovement.builder()
                .product(updated)
                .type(MovementType.STOCK_IN)
                .quantity(request.getQuantity())
                .previousStock(previousStock)
                .newStock(newStock)
                .reason(request.getReason())
                .user(currentUser)
                .build();

        stockMovementRepository.save(movement);

        return enrichComingSoon(ProductMapper.toResponse(updated));
    }

    @Override
    @Transactional
    public ProductResponseDto stockOut(Long id, StockAdjustmentRequestDto request) {
        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new BadRequestException("Quantity must be greater than zero for stock-out");
        }

        Product product = productRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Product not found with id " + id)
        );

        int previousStock = product.getStock();
        if (previousStock < request.getQuantity()) {
            throw new BadRequestException("Insufficient stock. Current stock: "
                    + previousStock + ", Requested reduction: " + request.getQuantity());
        }

        int newStock = previousStock - request.getQuantity();
        product.setStock(newStock);
        Product updated = productRepository.save(product);

        User currentUser = getCurrentAuthenticatedUser();

        StockMovement movement = StockMovement.builder()
                .product(updated)
                .type(MovementType.STOCK_OUT)
                .quantity(request.getQuantity())
                .previousStock(previousStock)
                .newStock(newStock)
                .reason(request.getReason())
                .user(currentUser)
                .build();

        stockMovementRepository.save(movement);

        if (newStock <= updated.getReorderLevel()) {
            String brandName = updated.getBrand() != null ? updated.getBrand().getName() : "N/A";
            String categoryName = updated.getCategory() != null ? updated.getCategory().getName() : "N/A";
            StockAlertEmailPayload alertPayload = StockAlertEmailPayload.builder()
                    .productId(updated.getId())
                    .productName(updated.getName())
                    .brandName(brandName)
                    .categoryName(categoryName)
                    .previousStock(previousStock)
                    .currentStock(newStock)
                    .reorderLevel(updated.getReorderLevel())
                    .triggerSource("Manual Stock Adjustment (Stock-Out)")
                    .build();
            try {
                emailService.sendAdminStockAlertEmail(alertPayload);
            } catch (Exception e) {
                log.error("Failed to trigger admin stock alert for Product #{}: {}", updated.getId(), e.getMessage());
            }
        }

        return enrichComingSoon(ProductMapper.toResponse(updated));
    }

    @Override
    @Transactional
    public ProductImageResponseDto addProductImage(Long productId, MultipartFile file) {
        Product product = productRepository.findById(productId).orElseThrow(
                () -> new ResourceNotFoundException("Product not found with id " + productId)
        );

        Map<?, ?> uploadResult = cloudinaryService.uploadFile(file, "stock_inventory/image");
        String imageUrl = (String) uploadResult.get("url");
        String publicId = (String) uploadResult.get("public_id");

        ProductImage image = ProductImage.builder()
                .product(product)
                .imageUrl(imageUrl)
                .publicId(publicId)
                .isPrimary(false)
                .build();

        ProductImage saved = productImageRepository.save(image);
        return ProductMapper.toImageResponse(saved);
    }

    @Override
    @Transactional
    public void deleteProductImage(Long productId, Long imageId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found with id " + productId);
        }

        ProductImage image = productImageRepository.findByIdAndProductId(imageId, productId).orElseThrow(
                () -> new ResourceNotFoundException("Image with id " + imageId + " does not belong to product with id " + productId)
        );

        if (image.getPublicId() != null && !image.getPublicId().isBlank()) {
            try {
                cloudinaryService.deleteFile(image.getPublicId());
            } catch (Exception ignored) {
            }
        }

        productImageRepository.delete(image);
    }

    @Override
    public List<ProductImageResponseDto> getProductImages(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found with id " + productId);
        }
        return productImageRepository.findByProductId(productId).stream()
                .map(ProductMapper::toImageResponse)
                .toList();
    }

    @Override
    public List<String> getAllBrands() {
        return productRepository.findDistinctBrands();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDto<ProductResponseDto> getCatalogProducts(
            String search,
            Long categoryId,
            Long brandId,
            String brand,
            Double minPrice,
            Double maxPrice,
            String sort,
            int page,
            int size
    ) {
        java.util.Set<Long> pendingProductIds = purchaseOrderRepository.findProductIdsInPendingPurchaseOrders();

        Specification<Product> spec = ProductSpecification.filterCatalog(
                search, categoryId, brandId, brand, minPrice, maxPrice, pendingProductIds
        );

        Sort sortObj;
        if ("price_asc".equalsIgnoreCase(sort)) {
            sortObj = Sort.by(Sort.Direction.ASC, "price");
        } else if ("price_desc".equalsIgnoreCase(sort)) {
            sortObj = Sort.by(Sort.Direction.DESC, "price");
        } else if ("name_asc".equalsIgnoreCase(sort)) {
            sortObj = Sort.by(Sort.Direction.ASC, "name");
        } else {
            // default "newest"
            sortObj = Sort.by(Sort.Direction.DESC, "id");
        }

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sortObj);
        Page<Product> productPage = productRepository.findAll(spec, pageable);

        Page<ProductResponseDto> dtoPage = productPage.map(p -> mapToResponseWithComingSoon(p, pendingProductIds));
        return PageResponseDto.from(dtoPage);
    }

    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !(authentication instanceof AnonymousAuthenticationToken)) {
            String username = authentication.getName();
            return userRepository.findByUsername(username).orElse(null);
        }
        return null;
    }
}
