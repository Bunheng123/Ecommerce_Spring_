package com.setec.stock_inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor 
@NoArgsConstructor
@Builder
public class ApiResponse <T>{
    private boolean success;
    private String message;
    private T data;
    private LocalDateTime timestamp;

    // for success return // we need to return obj and message to user back
    public static <T> ApiResponse<T> success(String msg,T data){
        return ApiResponse.<T>builder()
                .success(true)
                .message(msg)
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }

    // for fail return // only need msg cus obj is null so no need to return
    public static <T> ApiResponse<T> error(String msg){
        return ApiResponse.<T>builder()
                .success(false)
                .message(msg)
                .timestamp(LocalDateTime.now())
                .build();

    }

}
