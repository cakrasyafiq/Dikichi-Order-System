package com.ambatucode.dikichi.catalog.dto;

public record LoginResponse(String accessToken, String tokenType, long expiresIn, StaffIdentity user) {
}
