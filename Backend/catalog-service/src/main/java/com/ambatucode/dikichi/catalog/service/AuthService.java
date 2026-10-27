package com.ambatucode.dikichi.catalog.service;

import com.ambatucode.dikichi.catalog.config.JwtProperties;
import com.ambatucode.dikichi.catalog.dto.LoginRequest;
import com.ambatucode.dikichi.catalog.dto.LoginResponse;
import com.ambatucode.dikichi.catalog.dto.StaffIdentity;
import com.ambatucode.dikichi.catalog.entity.StaffUser;
import com.ambatucode.dikichi.catalog.exception.ApiException;
import com.ambatucode.dikichi.catalog.repository.StaffUserRepository;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final String TOKEN_TYPE = "Bearer";

    private final StaffUserRepository staffUsers;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final String dummyHash;

    public AuthService(StaffUserRepository staffUsers, PasswordEncoder passwordEncoder, JwtService jwtService,
                       JwtProperties jwtProperties) {
        this.staffUsers = staffUsers;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.jwtProperties = jwtProperties;
        this.dummyHash = passwordEncoder.encode("unused-password");
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        Optional<StaffUser> user = staffUsers.findByUsername(request.username());
        // WHY: hash a dummy value when the user is unknown so response time does not reveal valid usernames
        String hash = user.map(StaffUser::getPasswordHash).orElse(dummyHash);
        boolean passwordMatches = passwordEncoder.matches(request.password(), hash);
        if (user.isEmpty() || !passwordMatches) {
            throw ApiException.unauthorized("Invalid username or password");
        }
        StaffUser staff = user.get();
        StaffIdentity identity = new StaffIdentity(staff.getUsername(), staff.getRole(), staff.getOutletId());
        return new LoginResponse(jwtService.issue(staff), TOKEN_TYPE, jwtProperties.expiresInSeconds(), identity);
    }
}
