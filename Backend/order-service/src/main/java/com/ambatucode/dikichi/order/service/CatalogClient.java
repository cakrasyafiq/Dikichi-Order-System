package com.ambatucode.dikichi.order.service;

import com.ambatucode.dikichi.order.dto.catalog.CatalogErrorBody;
import com.ambatucode.dikichi.order.dto.catalog.CatalogValidateRequest;
import com.ambatucode.dikichi.order.dto.catalog.CatalogValidateResponse;
import com.ambatucode.dikichi.order.dto.catalog.CatalogValidateResponse.CatalogItem;
import com.ambatucode.dikichi.order.dto.common.ErrorDetail;
import com.ambatucode.dikichi.order.dto.common.OrderItemRequest;
import com.ambatucode.dikichi.order.exception.ApiException;
import java.io.IOException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class CatalogClient {

    private static final Logger log = LoggerFactory.getLogger(CatalogClient.class);
    private static final String VALIDATE_PATH = "/internal/orders/validate";
    private static final String REQUEST_ID_HEADER = "X-Request-Id";

    private final RestClient restClient;

    public CatalogClient(RestClient catalogRestClient) {
        this.restClient = catalogRestClient;
    }

    public List<CatalogItem> validate(String outletId, String tableCode, List<OrderItemRequest> items) {
        String requestId = MDC.get("requestId");
        CatalogResult result;
        try {
            result = restClient.post()
                    .uri(VALIDATE_PATH)
                    .headers(headers -> {
                        if (requestId != null) {
                            headers.set(REQUEST_ID_HEADER, requestId);
                        }
                    })
                    .body(new CatalogValidateRequest(outletId, tableCode, items))
                    .exchange((request, response) -> read(response));
        } catch (RuntimeException e) {
            // WHY: timeouts, connection failures, and unreadable bodies all mean the catalog cannot be trusted
            log.warn("Catalog validation call failed: {}", e.toString());
            throw ApiException.catalogUnavailable();
        }

        if (result.error() != null) {
            List<ErrorDetail> details =
                    result.error().errors() == null ? List.of() : result.error().errors();
            throw new ApiException(HttpStatus.valueOf(result.status()), result.error().code(),
                    result.error().message(), details);
        }
        return result.body().items();
    }

    private static CatalogResult read(RestClient.RequestHeadersSpec.ConvertibleClientHttpResponse response)
            throws IOException {
        HttpStatusCode status = response.getStatusCode();
        if (status.is2xxSuccessful()) {
            return new CatalogResult(response.bodyTo(CatalogValidateResponse.class), null, status.value());
        }
        if (status.is4xxClientError()) {
            return new CatalogResult(null, response.bodyTo(CatalogErrorBody.class), status.value());
        }
        throw new IllegalStateException("Catalog responded with " + status.value());
    }

    private record CatalogResult(CatalogValidateResponse body, CatalogErrorBody error, int status) {
    }
}
