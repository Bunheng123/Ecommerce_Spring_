package com.setec.stock_inventory.service.impl;

import com.setec.stock_inventory.config.CloudinaryService;
import com.setec.stock_inventory.dto.Request.UserProfileUpdateRequestDto;
import com.setec.stock_inventory.dto.Request.UserRequestDto;
import com.setec.stock_inventory.dto.Response.UserResponseDto;
import com.setec.stock_inventory.entity.User;
import com.setec.stock_inventory.enums.Role;
import com.setec.stock_inventory.exception.BadRequestException;
import com.setec.stock_inventory.exception.ResourceNotFoundException;
import com.setec.stock_inventory.mapper.UserMapper;
import com.setec.stock_inventory.repo.CartRepository;
import com.setec.stock_inventory.repo.UserRepository;
import com.setec.stock_inventory.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final CartRepository cartRepository;
    private final PasswordEncoder passwordEncoder;
    private final CloudinaryService cloudinaryService;

    @Override
    public List<UserResponseDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserMapper::toResponse)
                .toList();
    }

    @Override
    public UserResponseDto createUser(UserRequestDto request) {
        if (request.getUsername() == null || request.getUsername().isBlank()) {
            if (request.getFullName() != null && !request.getFullName().isBlank()) {
                request.setUsername(request.getFullName().trim().toLowerCase().replaceAll("\\s+", "_"));
            } else if (request.getEmail() != null) {
                request.setUsername(request.getEmail().split("@")[0]);
            }
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("User with username '" + request.getUsername() + "' already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("User with email '" + request.getEmail() + "' already exists");
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new BadRequestException("Password is required");
        }
        User user = UserMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        User savedUser = userRepository.save(user);
        return UserMapper.toResponse(savedUser);
    }

    @Override
    public UserResponseDto getUserById(Long id) {
        User user = userRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("User not found with id " + id)
        );
        return UserMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserResponseDto updateUser(Long id, UserRequestDto request) {
        User user = userRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("User not found with id " + id)
        );
        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            String newUsername = request.getUsername().trim();
            if (!newUsername.equalsIgnoreCase(user.getUsername()) && userRepository.existsByUsername(newUsername)) {
                throw new BadRequestException("User with username '" + newUsername + "' already exists");
            }
            user.setUsername(newUsername);
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String newEmail = request.getEmail().trim();
            if (!newEmail.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(newEmail)) {
                throw new BadRequestException("User with email '" + newEmail + "' already exists");
            }
            user.setEmail(newEmail);
        }
        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }

        if (request.getRole() != null && !request.getRole().isBlank()) {
            try {
                user.setRole(Role.valueOf(request.getRole().trim().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid role: " + request.getRole() + ". Must be ADMIN, STOCK, or USER");
            }
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        User updatedUser = userRepository.save(user);
        return UserMapper.toResponse(updatedUser);
    }

    @Override
    @Transactional
    public void deleteUser(Long id) {
        User currentUser = getCurrentAuthenticatedUser();
        if (currentUser.getId().equals(id)) {
            throw new BadRequestException("You cannot delete your own account");
        }
        User user = userRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("User not found with id " + id)
        );

        // Clean up associated cart if exists so it doesn't fail foreign key constraint
        cartRepository.findByUserId(id).ifPresent(cartRepository::delete);

        // Clean up Cloudinary avatar if exists
        if (user.getProfilePublicId() != null && !user.getProfilePublicId().isBlank()) {
            try {
                cloudinaryService.deleteFile(user.getProfilePublicId());
            } catch (Exception ignored) {
            }
        }

        userRepository.delete(user);
    }

    @Override
    public UserResponseDto getCurrentUserProfile() {
        User user = getCurrentAuthenticatedUser();
        return UserMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserResponseDto updateCurrentUserProfile(UserProfileUpdateRequestDto request) {
        User user = getCurrentAuthenticatedUser();

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }

        User saved = userRepository.save(user);
        return UserMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public UserResponseDto updateCurrentUserProfilePicture(MultipartFile file) {
        User user = getCurrentAuthenticatedUser();

        if (user.getProfilePublicId() != null && !user.getProfilePublicId().isBlank()) {
            try {
                cloudinaryService.deleteFile(user.getProfilePublicId());
            } catch (Exception ignored) {
            }
        }

        Map<?, ?> uploadResult = cloudinaryService.uploadFile(file, "stock_inventory/profile");
        String imageUrl = (String) uploadResult.get("url");
        String publicId = (String) uploadResult.get("public_id");

        user.setProfileImageUrl(imageUrl);
        user.setProfilePublicId(publicId);

        User saved = userRepository.save(user);
        return UserMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public UserResponseDto updateUserProfilePicture(Long id, MultipartFile file) {
        User user = userRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("User not found with id " + id)
        );

        if (user.getProfilePublicId() != null && !user.getProfilePublicId().isBlank()) {
            try {
                cloudinaryService.deleteFile(user.getProfilePublicId());
            } catch (Exception ignored) {
            }
        }

        Map<?, ?> uploadResult = cloudinaryService.uploadFile(file, "stock_inventory/profile");
        String imageUrl = (String) uploadResult.get("url");
        String publicId = (String) uploadResult.get("public_id");

        user.setProfileImageUrl(imageUrl);
        user.setProfilePublicId(publicId);

        User saved = userRepository.save(user);
        return UserMapper.toResponse(saved);
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
