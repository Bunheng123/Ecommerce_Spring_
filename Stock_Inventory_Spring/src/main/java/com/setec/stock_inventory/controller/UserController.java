package com.setec.stock_inventory.controller;

import com.setec.stock_inventory.dto.ApiResponse;
import com.setec.stock_inventory.dto.Request.UserProfileUpdateRequestDto;
import com.setec.stock_inventory.dto.Request.UserRequestDto;
import com.setec.stock_inventory.dto.Response.UserResponseDto;
import com.setec.stock_inventory.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    // --- Profile Endpoints (Authenticated User) ---

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponseDto>> getCurrentUserProfile() {
        UserResponseDto profile = userService.getCurrentUserProfile();
        return ResponseEntity.ok(ApiResponse.success("Profile fetched successfully", profile));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponseDto>> updateCurrentUserProfile(
            @Valid @RequestBody UserProfileUpdateRequestDto request) {
        UserResponseDto updatedProfile = userService.updateCurrentUserProfile(request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", updatedProfile));
    }

    @PostMapping(value = "/me/profile-picture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserResponseDto>> updateCurrentUserProfilePicture(
            @RequestParam("file") MultipartFile file) {
        UserResponseDto updatedProfile = userService.updateCurrentUserProfilePicture(file);
        return ResponseEntity.ok(ApiResponse.success("Profile picture updated successfully", updatedProfile));
    }

    // --- Administrative Endpoints (ADMIN only) ---

    @PostMapping
    public ResponseEntity<ApiResponse<UserResponseDto>> createUser(
            @Valid @RequestBody UserRequestDto request) {
        UserResponseDto userResponseDto = userService.createUser(request);
        return new ResponseEntity<>(
                ApiResponse.success("User created successfully", userResponseDto),
                HttpStatus.CREATED
        );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponseDto>>> getAllUsers() {
        List<UserResponseDto> userResponseDto = userService.getAllUsers();
        return ResponseEntity.ok(
                ApiResponse.success("Users fetched successfully", userResponseDto)
        );
    }

    @GetMapping("/{id:[0-9]+}")
    public ResponseEntity<ApiResponse<UserResponseDto>> getUserById(@PathVariable Long id) {
        UserResponseDto userResponseDto = userService.getUserById(id);
        return ResponseEntity.ok(
                ApiResponse.success("User fetched successfully", userResponseDto)
        );
    }

    @PutMapping("/{id:[0-9]+}")
    public ResponseEntity<ApiResponse<UserResponseDto>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserRequestDto request) {
        UserResponseDto userResponseDto = userService.updateUser(id, request);
        return ResponseEntity.ok(
                ApiResponse.success("User updated successfully", userResponseDto)
        );
    }

    @DeleteMapping("/{id:[0-9]+}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(
                ApiResponse.success("User deleted successfully", null)
        );
    }

    @PostMapping(value = "/{id:[0-9]+}/profile-picture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserResponseDto>> updateUserProfilePicture(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        UserResponseDto updatedProfile = userService.updateUserProfilePicture(id, file);
        return ResponseEntity.ok(ApiResponse.success("Profile picture updated successfully", updatedProfile));
    }
}
