package com.setec.stock_inventory.service;

import com.setec.stock_inventory.dto.Request.ChangePasswordRequestDto;
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

    UserResponseDto toggleUserStatus(Long id);

    void deleteUser(Long id);

    UserResponseDto getCurrentUserProfile();

    UserResponseDto updateCurrentUserProfile(UserProfileUpdateRequestDto request);

    void changeCurrentUserPassword(ChangePasswordRequestDto request);

    UserResponseDto updateCurrentUserProfilePicture(MultipartFile file);

    UserResponseDto updateUserProfilePicture(Long id, MultipartFile file);
}
