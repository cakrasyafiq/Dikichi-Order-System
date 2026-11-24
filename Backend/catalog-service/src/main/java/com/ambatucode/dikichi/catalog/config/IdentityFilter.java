package com.ambatucode.dikichi.catalog.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class IdentityFilter extends OncePerRequestFilter {

    private static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final String OUTLET_HEADER = "X-Outlet-Id";
    private static final String MDC_REQUEST_ID = "requestId";

    private final CallerContext caller;

    public IdentityFilter(CallerContext caller) {
        this.caller = caller;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        MDC.put(MDC_REQUEST_ID, requestId == null ? "-" : requestId);
        try {
            String outletId = request.getHeader(OUTLET_HEADER);
            if (outletId != null && !outletId.isBlank()) {
                caller.populate(outletId.strip());
            }
            chain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_REQUEST_ID);
        }
    }
}
