    package com.setec.stock_inventory.mapper;

    import org.springframework.stereotype.Service;

    import com.setec.stock_inventory.dto.Request.CategoryRequestDto;
    import com.setec.stock_inventory.dto.Response.CategoryResponseDto;
    import com.setec.stock_inventory.entity.Category;

    @Service 
    public class CategoryMapper {

        // take from database to response
        //Database → Category (entity) → toResponse() → CategoryResponseDto → sent to client
        public static CategoryResponseDto toResponse(Category category) {
            if (category == null) {
                return null;
            }

            return CategoryResponseDto.builder()// if the response did not related or get from other table it will not use the lazy
                    .id(category.getId())
                    .name(category.getName())
                    .description(category.getDescription())
                    .createdAt(category.getCreatedAt())
                    .updatedAt(category.getUpdatedAt())
                    .build();
        }

        // take data from request add to entity and response obj back to service
        public static Category toEntity(CategoryRequestDto request) {
            if (request == null) {
                return null;
            }

            return Category.builder()
                    .name(request.getName())
                    .description(request.getDescription())
                    .build();
        }

        // Update existing entity with incoming request data (for PUT/PATCH operations)
        public static void updateEntity(Category category, CategoryRequestDto request) {
            if (category == null || request == null) {
                return;
            }
            category.setName(request.getName());
            category.setDescription(request.getDescription());
        }
    }
