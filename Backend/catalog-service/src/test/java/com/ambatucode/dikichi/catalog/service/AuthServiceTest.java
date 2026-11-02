package com.ambatucode.dikichi.catalog.service;

import static com.ambatucode.dikichi.catalog.support.ApiAssertions.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.catalog.config.JwtProperties;
import com.ambatucode.dikichi.catalog.dto.LoginRequest;
import com.ambatucode.dikichi.catalog.dto.LoginResponse;
import com.ambatucode.dikichi.catalog.entity.Role;
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

    private StaffUser staff(String username, String rawPassword, Role role, String outletId) {
        StaffUser user = mock(StaffUser.class);
        when(user.getUsername()).thenReturn(username);
        when(user.getPasswordHash()).thenReturn(encoder.encode(rawPassword));
        when(user.getRole()).thenReturn(role);
        when(user.getOutletId()).thenReturn(outletId);
        when(staffUsers.findByUsername(username)).thenReturn(Optional.of(user));
        return user;
    }

    @Test
    void validCredentialsReturnTokenAndIdentity() {
        staff("cashier", "secret-pass", Role.CASHIER, "OUT-01");

        LoginResponse response = service.login(new LoginRequest("cashier", "secret-pass"));

        assertThat(response.accessToken()).isEqualTo("token-abc");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(28800L);
        assertThat(response.user().username()).isEqualTo("cashier");
        assertThat(response.user().role()).isEqualTo(Role.CASHIER);
        assertThat(response.user().outletId()).isEqualTo("OUT-01");
    }

    @Test
    void masterHasNoOutlet() {
        staff("master", "secret-pass", Role.MASTER, null);

        LoginResponse response = service.login(new LoginRequest("master", "secret-pass"));

        assertThat(response.user().role()).isEqualTo(Role.MASTER);
        assertThat(response.user().outletId()).isNull();
    }

    @Test
    void wrongPasswordIsRejectedWithGenericMessage() {
        staff("cashier", "secret-pass", Role.CASHIER, "OUT-01");

        ApiException error = assertApiError(() -> service.login(new LoginRequest("cashier", "wrong-pass")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(error.getCode()).isEqualTo("UNAUTHORIZED");
        assertThat(error.getMessage()).isEqualTo("Invalid username or password");
    }

    @Test
    void unknownUserGetsTheSameMessageAsWrongPassword() {
        when(staffUsers.findByUsername("ghost")).thenReturn(Optional.empty());
        staff("cashier", "secret-pass", Role.CASHIER, "OUT-01");

        ApiException unknownUser = assertApiError(() -> service.login(new LoginRequest("ghost", "any-pass")));
        ApiException wrongPassword = assertApiError(() -> service.login(new LoginRequest("cashier", "wrong-pass")));

        assertThat(unknownUser.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(unknownUser.getMessage()).isEqualTo(wrongPassword.getMessage());
    }
}
