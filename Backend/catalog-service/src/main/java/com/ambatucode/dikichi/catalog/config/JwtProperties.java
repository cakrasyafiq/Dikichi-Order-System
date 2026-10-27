package com.ambatucode.dikichi.catalog.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dikichi.jwt")
public record JwtProperties(String secret, long expiresInSeconds) {
}
