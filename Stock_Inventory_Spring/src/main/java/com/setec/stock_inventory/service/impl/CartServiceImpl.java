package com.setec.stock_inventory.service.impl;

import com.setec.stock_inventory.dto.Request.CartItemRequestDto;
import com.setec.stock_inventory.dto.Request.CartItemUpdateRequestDto;
import com.setec.stock_inventory.dto.Response.CartResponseDto;
import com.setec.stock_inventory.entity.Cart;
import com.setec.stock_inventory.entity.CartItem;
import com.setec.stock_inventory.entity.Product;
import com.setec.stock_inventory.entity.User;
import com.setec.stock_inventory.exception.BadRequestException;
import com.setec.stock_inventory.exception.ResourceNotFoundException;
import com.setec.stock_inventory.mapper.CartMapper;
import com.setec.stock_inventory.repo.CartRepository;
import com.setec.stock_inventory.repo.ProductRepository;
import com.setec.stock_inventory.repo.UserRepository;
import com.setec.stock_inventory.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public CartResponseDto getCart() {
        User currentUser = getCurrentAuthenticatedUser();
        Cart cart = getOrCreateCart(currentUser);
        return CartMapper.toResponse(cart);
    }

    @Override
    @Transactional
    public CartResponseDto addItem(CartItemRequestDto request) {
        User currentUser = getCurrentAuthenticatedUser();
        Product product = productRepository.findById(request.getProductId()).orElseThrow(
                () -> new ResourceNotFoundException("Cannot find product with id: " + request.getProductId())
        );

        if (!product.isActive()) {
            throw new BadRequestException("Cannot add inactive product to cart: " + product.getName());
        }

        Cart cart = getOrCreateCart(currentUser);

        Optional<CartItem> existingItemOpt = cart.getItems().stream()
                .filter(item -> item.getProduct().getId().equals(request.getProductId()))
                .findFirst();

        if (existingItemOpt.isPresent()) {
            CartItem existingItem = existingItemOpt.get();
            int newQuantity = existingItem.getQuantity() + request.getQuantity();
            if (newQuantity > product.getStock()) {
                throw new BadRequestException("Requested quantity (" + newQuantity +
                        ") exceeds available stock (" + product.getStock() + ") for product: " + product.getName());
            }
            existingItem.setQuantity(newQuantity);
        } else {
            if (request.getQuantity() > product.getStock()) {
                throw new BadRequestException("Requested quantity (" + request.getQuantity() +
                        ") exceeds available stock (" + product.getStock() + ") for product: " + product.getName());
            }
            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .product(product)
                    .quantity(request.getQuantity())
                    .build();
            cart.getItems().add(newItem);
        }

        Cart saved = cartRepository.save(cart);
        return CartMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public CartResponseDto updateItem(Long itemId, CartItemUpdateRequestDto request) {
        User currentUser = getCurrentAuthenticatedUser();
        Cart cart = getOrCreateCart(currentUser);

        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Cart item with id " + itemId + " not found in current cart"));

        Product product = item.getProduct();
        if (request.getQuantity() > product.getStock()) {
            throw new BadRequestException("Requested quantity (" + request.getQuantity() +
                    ") exceeds available stock (" + product.getStock() + ") for product: " + product.getName());
        }

        item.setQuantity(request.getQuantity());
        Cart saved = cartRepository.save(cart);
        return CartMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public CartResponseDto removeItem(Long itemId) {
        User currentUser = getCurrentAuthenticatedUser();
        Cart cart = getOrCreateCart(currentUser);

        boolean removed = cart.getItems().removeIf(item -> item.getId().equals(itemId));
        if (!removed) {
            throw new ResourceNotFoundException("Cart item with id " + itemId + " not found in current cart");
        }

        Cart saved = cartRepository.save(cart);
        return CartMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public CartResponseDto clearCart() {
        User currentUser = getCurrentAuthenticatedUser();
        Cart cart = getOrCreateCart(currentUser);
        cart.getItems().clear();
        Cart saved = cartRepository.save(cart);
        return CartMapper.toResponse(saved);
    }

    private Cart getOrCreateCart(User user) {
        return cartRepository.findByUserIdWithItems(user.getId())
                .orElseGet(() -> {
                    Cart newCart = Cart.builder()
                            .user(user)
                            .items(new ArrayList<>())
                            .build();
                    return cartRepository.save(newCart);
                });
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
