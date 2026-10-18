package com.setec.stock_inventory.service.impl;

import com.setec.stock_inventory.dto.Response.ProductResponseDto;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.entity.User;
import com.setec.stock_inventory.entity.WishlistItem;
import com.setec.stock_inventory.exception.BadRequestException;
import com.setec.stock_inventory.exception.ResourceNotFoundException;
import com.setec.stock_inventory.mapper.ProductMapper;
import com.setec.stock_inventory.repo.ProductRepository;
import com.setec.stock_inventory.repo.UserRepository;
import com.setec.stock_inventory.repo.WishlistItemRepository;
import com.setec.stock_inventory.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class WishlistServiceImpl implements WishlistService {

    private final WishlistItemRepository wishlistItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponseDto> getWishlist() {
        User currentUser = getCurrentAuthenticatedUser();
        List<WishlistItem> items = wishlistItemRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());
        return items.stream()
                .map(WishlistItem::getProduct)
                .map(ProductMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public ProductResponseDto addToWishlist(Long productId) {
        User currentUser = getCurrentAuthenticatedUser();

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find product with id: " + productId));

        Optional<WishlistItem> existing = wishlistItemRepository.findByUserIdAndProductId(currentUser.getId(), productId);
        if (existing.isPresent()) {
            return ProductMapper.toResponse(product);
        }

        WishlistItem item = WishlistItem.builder()
                .user(currentUser)
                .product(product)
                .build();
        wishlistItemRepository.save(item);

        return ProductMapper.toResponse(product);
    }

    @Override
    @Transactional
    public void removeFromWishlist(Long productId) {
        User currentUser = getCurrentAuthenticatedUser();
        wishlistItemRepository.deleteByUserIdAndProductId(currentUser.getId(), productId);
    }

    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !(authentication instanceof AnonymousAuthenticationToken)) {
            String username = authentication.getName();
            return userRepository.findByUsername(username)
                    .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found: " + username));
        }
        throw new BadRequestException("No authenticated user found in security context");
    }
}
