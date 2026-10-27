package com.ambatucode.dikichi.gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dikichi.jwt")
public record JwtProperties(String secret) {
}
