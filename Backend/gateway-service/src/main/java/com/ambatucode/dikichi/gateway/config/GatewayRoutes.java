package com.ambatucode.dikichi.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayRoutes {

    @Bean
    public RouteLocator routes(RouteLocatorBuilder builder, UpstreamProperties upstream) {
        return builder.routes()
                .route("catalog-service", route -> route
                        .path("/api/v1/auth/**", "/api/v1/outlets/**", "/api/v1/menu-items/**")
                        .uri(upstream.catalog()))
                .route("order-service", route -> route
                        .path("/api/v1/orders/**")
                        .uri(upstream.order()))
                .build();
    }
}
