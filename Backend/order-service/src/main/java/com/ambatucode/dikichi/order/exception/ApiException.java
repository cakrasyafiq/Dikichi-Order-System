package com.ambatucode.dikichi.order.exception;

import com.ambatucode.dikichi.order.dto.common.ErrorDetail;
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

    public static ApiException badRequest(String code, String message, List<ErrorDetail> errors) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message, errors);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", message, List.of());
    }

    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", message, List.of());
    }

    public static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message, List.of());
    }

    public static ApiException catalogUnavailable() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "CATALOG_UNAVAILABLE",
                "Catalog service is unavailable", List.of());
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
