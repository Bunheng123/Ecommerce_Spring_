package com.setec.stock_inventory.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.setec.stock_inventory.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public Map<?, ?> uploadFile(MultipartFile file) {
        return uploadFile(file, "stock_inventory/image");
    }

    public Map<?, ?> uploadFile(MultipartFile file, String folderName) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is empty or missing.");
        }
        try {
            return cloudinary.uploader()
                    .upload(
                            file.getBytes(),
                            ObjectUtils.asMap("folder", folderName != null && !folderName.isBlank() ? folderName : "stock_inventory/image")
                    );
        } catch (IOException e) {
            throw new BadRequestException("Failed to upload image to Cloudinary: " + e.getMessage());
        }
    }

    public Map deleteFile(String publicId) {
        if (publicId == null || publicId.trim().isEmpty()) {
            return Map.of();
        }
        try {
            return cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (IOException e) {
            throw new BadRequestException("Failed to delete image from Cloudinary: " + e.getMessage());
        }
    }
}
