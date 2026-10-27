package com.ambatucode.dikichi.catalog.exception;

import com.ambatucode.dikichi.catalog.dto.ErrorDetail;
import java.util.List;
import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final List<ErrorDetail> errors;

    public ApiException(HttpStatus status, String code, String message, List<ErrorDetail> errors) {
        super(message);
        this.status = status;
        this.code = code;
        this.errors = errors;
    }

    public static ApiException unauthorized(String message) {
        return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", message, List.of());
    }

    public static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", message, List.of());
    }

    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", message, List.of());
    }

    public static ApiException conflict(String code, String message, List<ErrorDetail> errors) {
        return new ApiException(HttpStatus.CONFLICT, code, message, errors);
    }

    public static ApiException unprocessable(String code, String message, List<ErrorDetail> errors) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, code, message, errors);
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public List<ErrorDetail> getErrors() {
        return errors;
    }
}
