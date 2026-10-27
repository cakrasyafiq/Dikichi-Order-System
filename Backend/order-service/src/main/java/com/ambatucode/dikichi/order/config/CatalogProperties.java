package com.ambatucode.dikichi.order.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dikichi.catalog")
public record CatalogProperties(String baseUrl, Duration connectTimeout, Duration readTimeout) {
}
