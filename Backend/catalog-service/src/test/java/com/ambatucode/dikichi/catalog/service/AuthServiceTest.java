package com.ambatucode.dikichi.catalog.service;

import static com.ambatucode.dikichi.catalog.support.ApiAssertions.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.catalog.config.JwtProperties;
import com.ambatucode.dikichi.catalog.dto.LoginRequest;
import com.ambatucode.dikichi.catalog.dto.LoginResponse;
import com.ambatucode.dikichi.catalog.entity.StaffUser;
import com.ambatucode.dikichi.catalog.exception.ApiException;
import com.ambatucode.dikichi.catalog.repository.StaffUserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceTest {

    private final StaffUserRepository staffUsers = mock(StaffUserRepository.class);
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();
    private final JwtService jwtService = mock(JwtService.class);
    private final JwtProperties properties = new JwtProperties("x".repeat(40), 28800);
    private final AuthService service = new AuthService(staffUsers, encoder, jwtService, properties);

    @BeforeEach
    void setUp() {
        when(jwtService.issue(any(StaffUser.class))).thenReturn("token-abc");
    }

    private StaffUser outletAccount(String outletId, String rawPassword) {
        StaffUser user = new StaffUser(outletId, encoder.encode(rawPassword));
        when(staffUsers.findByOutletId(outletId)).thenReturn(Optional.of(user));
        return user;
    }

    @Test
    void validCredentialsReturnTokenAndOutletIdentity() {
        outletAccount("OUT-01", "secret-pass");

        LoginResponse response = service.login(new LoginRequest("OUT-01", "secret-pass"));

        assertThat(response.accessToken()).isEqualTo("token-abc");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(28800L);
        assertThat(response.user().outletId()).isEqualTo("OUT-01");
    }

    @Test
    void wrongPasswordIsRejectedWithGenericMessage() {
        outletAccount("OUT-01", "secret-pass");

        ApiException error = assertApiError(() -> service.login(new LoginRequest("OUT-01", "wrong-pass")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(error.getCode()).isEqualTo("UNAUTHORIZED");
        assertThat(error.getMessage()).isEqualTo("Invalid outlet ID or password");
    }

    @Test
    void unknownOutletGetsTheSameMessageAsWrongPassword() {
        when(staffUsers.findByOutletId("OUT-99")).thenReturn(Optional.empty());
        outletAccount("OUT-01", "secret-pass");

        ApiException unknownOutlet = assertApiError(() -> service.login(new LoginRequest("OUT-99", "any-pass")));
        ApiException wrongPassword = assertApiError(() -> service.login(new LoginRequest("OUT-01", "wrong-pass")));

        assertThat(unknownOutlet.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(unknownOutlet.getMessage()).isEqualTo(wrongPassword.getMessage());
    }
}
