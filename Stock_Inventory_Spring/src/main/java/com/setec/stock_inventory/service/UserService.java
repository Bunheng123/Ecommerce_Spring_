package com.setec.stock_inventory.service;

import com.setec.stock_inventory.dto.Request.UserProfileUpdateRequestDto;
import com.setec.stock_inventory.dto.Request.UserRequestDto;
import com.setec.stock_inventory.dto.Response.UserResponseDto;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface UserService {

    UserResponseDto createUser(UserRequestDto request);

    List<UserResponseDto> getAllUsers();

    UserResponseDto getUserById(Long id);

    UserResponseDto updateUser(Long id, UserRequestDto request);

    void deleteUser(Long id);

    UserResponseDto getCurrentUserProfile();

    UserResponseDto updateCurrentUserProfile(UserProfileUpdateRequestDto request);

    UserResponseDto updateCurrentUserProfilePicture(MultipartFile file);

    UserResponseDto updateUserProfilePicture(Long id, MultipartFile file);
}
