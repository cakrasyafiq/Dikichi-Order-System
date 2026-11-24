package com.ambatucode.dikichi.order.config;

import com.ambatucode.dikichi.order.exception.ApiException;
import java.util.Objects;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

@Component
@RequestScope
public class CallerContext {

    private String outletId;

    public void populate(String outletId) {
        this.outletId = outletId;
    }

    public String outletId() {
        return outletId;
    }

    public void requireAuthenticated() {
        if (outletId == null || outletId.isBlank()) {
            throw ApiException.forbidden("Authentication is required to perform this action");
        }
    }

    public void requireSameOutlet(String targetOutletId) {
        requireAuthenticated();
        if (!Objects.equals(outletId, targetOutletId)) {
            throw ApiException.forbidden("Resource belongs to another outlet");
        }
    }
}
