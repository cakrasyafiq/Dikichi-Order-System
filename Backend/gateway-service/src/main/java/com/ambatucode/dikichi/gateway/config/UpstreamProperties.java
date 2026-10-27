package com.ambatucode.dikichi.gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dikichi.upstream")
public record UpstreamProperties(String catalog, String order) {
}
