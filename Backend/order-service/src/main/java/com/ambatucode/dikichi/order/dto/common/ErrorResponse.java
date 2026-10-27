package com.ambatucode.dikichi.order.dto.common;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

public record ErrorResponse(Instant timestamp, int status, String code, String message, String path,
                            List<ErrorDetail> errors) {

    public static ErrorResponse of(int status, String code, String message, String path, List<ErrorDetail> errors) {
        return new ErrorResponse(Instant.now().truncatedTo(ChronoUnit.SECONDS), status, code, message, path, errors);
    }
}
