package com.ambatucode.dikichi.order.dto.catalog;

import com.ambatucode.dikichi.order.dto.common.ErrorDetail;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CatalogErrorBody(String code, String message, List<ErrorDetail> errors) {
}
