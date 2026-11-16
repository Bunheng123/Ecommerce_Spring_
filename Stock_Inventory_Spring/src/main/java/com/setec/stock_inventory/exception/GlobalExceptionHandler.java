package com.setec.stock_inventory.exception;

import com.setec.stock_inventory.dto.ApiResponse;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // exception for bad request
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadRequestException(BadRequestException ex) {
        return new ResponseEntity<>(
                ApiResponse.error(ex.getMessage()),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ApiResponse<Object>> handleRateLimitExceededException(RateLimitExceededException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", String.valueOf(ex.getRetryAfterSeconds()))
                .body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(org.springframework.security.authentication.BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadCredentialsException(org.springframework.security.authentication.BadCredentialsException ex) {
        return new ResponseEntity<>(
                ApiResponse.error("Invalid username or password."),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(org.springframework.security.authentication.LockedException.class)
    public ResponseEntity<ApiResponse<Object>> handleLockedException(org.springframework.security.authentication.LockedException ex) {
        return new ResponseEntity<>(
                ApiResponse.error(ex.getMessage()),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(org.springframework.security.authentication.DisabledException.class)
    public ResponseEntity<ApiResponse<Object>> handleDisabledException(org.springframework.security.authentication.DisabledException ex) {
        return new ResponseEntity<>(
                ApiResponse.error("Your account has been deactivated by an administrator."),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleResourceNotFoundException(ResourceNotFoundException ex) {
        return new ResponseEntity<>(
                ApiResponse.error("Error : " + ex.getMessage()),
                HttpStatus.NOT_FOUND
        );
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAccessDeniedException(org.springframework.security.access.AccessDeniedException ex) {
        return new ResponseEntity<>(
                ApiResponse.error("Forbidden: " + ex.getMessage()),
                HttpStatus.FORBIDDEN
        );
    }

    // handle validation, special in request
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String,String>>> handleMethodArgumentNotValidException(
        MethodArgumentNotValidException ex
    ) {
        Map<String,String> errors = new HashMap<>();

        // mapping error from field validation
        ex.getBindingResult().getFieldErrors().forEach(
            (error) -> {
            String getField = ((FieldError) error).getField();
            String getErrorCode = error.getCode();
            errors.put(getField, getErrorCode);
        });

        return new ResponseEntity<>(
                ApiResponse.<Map<String,String>>builder()
                .success(false)
                .message("Validation error : " + ex.getMessage())
                .data(errors)
                .timestamp(LocalDateTime.now())
                .build(),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleDataIntegrityViolationException(
            org.springframework.dao.DataIntegrityViolationException ex
    ) {
        return new ResponseEntity<>(
                ApiResponse.error("Cannot delete or modify this record because it is referenced by other data (e.g. orders, carts, or stock records)."),
                HttpStatus.CONFLICT
        );
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleNoResourceFoundException(
            org.springframework.web.servlet.resource.NoResourceFoundException ex
    ) {
        return new ResponseEntity<>(
                ApiResponse.error("Endpoint not found: " + ex.getResourcePath()),
                HttpStatus.NOT_FOUND
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGeneralException(Exception ex) {
        return new ResponseEntity<>(
                ApiResponse.error("An unexpected error occurred: " + ex.getMessage()),
                HttpStatus.INTERNAL_SERVER_ERROR
        );
    }

}
