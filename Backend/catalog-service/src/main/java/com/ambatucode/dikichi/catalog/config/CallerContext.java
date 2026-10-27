package com.ambatucode.dikichi.catalog.config;

import com.ambatucode.dikichi.catalog.entity.Role;
import com.ambatucode.dikichi.catalog.exception.ApiException;
import java.util.Arrays;
import java.util.Objects;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

@Component
@RequestScope
public class CallerContext {

    private Role role;
    private String outletId;

    public void populate(Role role, String outletId) {
        this.role = role;
        this.outletId = outletId;
    }

    public void requireRole(Role... allowed) {
        if (role == null || !Arrays.asList(allowed).contains(role)) {
            throw ApiException.forbidden("Role is not allowed to perform this action");
        }
    }

    public void requireSameOutlet(String targetOutletId) {
        if (role != Role.MASTER && !Objects.equals(outletId, targetOutletId)) {
            throw ApiException.forbidden("Resource belongs to another outlet");
        }
    }
}
