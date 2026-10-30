package com.jiralite.backend.config;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ApiError> responseStatus(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode())
                .body(new ApiError(exception.getStatusCode().value(), exception.getReason()));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, ConstraintViolationException.class})
    ResponseEntity<ApiError> validation(Exception exception) {
        return ResponseEntity.badRequest().body(new ApiError(HttpStatus.BAD_REQUEST.value(),
                "Request validation failed"));
    }

    public record ApiError(int status, String message, Instant timestamp) {
        ApiError(int status, String message) {
            this(status, message == null ? "Request failed" : message, Instant.now());
        }
    }
}
