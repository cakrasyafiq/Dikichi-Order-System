package com.ambatucode.dikichi.gateway.filter;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class IdentityHeaderFilter implements GlobalFilter, Ordered {

    private static final String USER_NAME = "X-User-Name";
    private static final String USER_ROLE = "X-User-Role";
    private static final String OUTLET_ID = "X-Outlet-Id";
    private static final String REQUEST_ID = "X-Request-Id";
    private static final List<String> IDENTITY_HEADERS = List.of(USER_NAME, USER_ROLE, OUTLET_ID, REQUEST_ID);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .filter(JwtAuthenticationToken.class::isInstance)
                .map(authentication -> ((JwtAuthenticationToken) authentication).getToken())
                .map(Optional::of)
                .defaultIfEmpty(Optional.empty())
                .flatMap(jwt -> chain.filter(withIdentity(exchange, jwt.orElse(null))));
    }

    @Override
    public int getOrder() {
        return -1;
    }

    private static ServerWebExchange withIdentity(ServerWebExchange exchange, Jwt jwt) {
        ServerHttpRequest request = exchange.getRequest().mutate()
                .headers(headers -> {
                    // WHY: strip first so a client can never forge an identity on public routes
                    IDENTITY_HEADERS.forEach(headers::remove);
                    headers.set(REQUEST_ID, UUID.randomUUID().toString());
                    if (jwt != null) {
                        headers.set(USER_NAME, jwt.getSubject());
                        headers.set(USER_ROLE, jwt.getClaimAsString("role"));
                        String outletId = jwt.getClaimAsString("outletId");
                        if (outletId != null) {
                            headers.set(OUTLET_ID, outletId);
                        }
                    }
                })
                .build();
        return exchange.mutate().request(request).build();
    }
}
