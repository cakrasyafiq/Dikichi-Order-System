package com.ambatucode.dikichi.catalog.dto;

import com.ambatucode.dikichi.catalog.entity.Role;

public record StaffIdentity(String username, Role role, String outletId) {
}
