package com.ambatucode.dikichi.catalog.service;

import static com.ambatucode.dikichi.catalog.support.ApiAssertions.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.catalog.config.CallerContext;
import com.ambatucode.dikichi.catalog.dto.OutletCreateRequest;
import com.ambatucode.dikichi.catalog.dto.OutletResponse;
import com.ambatucode.dikichi.catalog.entity.Outlet;
import com.ambatucode.dikichi.catalog.entity.Role;
import com.ambatucode.dikichi.catalog.exception.ApiException;
import com.ambatucode.dikichi.catalog.repository.OutletRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class OutletServiceTest {

    private final OutletRepository outlets = mock(OutletRepository.class);
    private final CallerContext caller = new CallerContext();
    private final OutletService service = new OutletService(outlets, caller);

    @BeforeEach
    void setUp() {
        when(outlets.save(any(Outlet.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void masterCreatesOutletWithTrimmedFields() {
        caller.populate(Role.MASTER, null);
        when(outlets.existsById("OUT-05")).thenReturn(false);

        OutletResponse response = service.create(new OutletCreateRequest("OUT-05", "  Dikichi 05 ", "  Jl. Uji No. 5 "));

        assertThat(response.id()).isEqualTo("OUT-05");
        assertThat(response.name()).isEqualTo("Dikichi 05");
        assertThat(response.address()).isEqualTo("Jl. Uji No. 5");
    }

    @Test
    void duplicateOutletIdIsRejected() {
        caller.populate(Role.MASTER, null);
        when(outlets.existsById("OUT-01")).thenReturn(true);

        ApiException error = assertApiError(() -> service.create(new OutletCreateRequest("OUT-01", "Nama", "Alamat")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(error.getCode()).isEqualTo("DUPLICATE_OUTLET_ID");
        verify(outlets, never()).save(any(Outlet.class));
    }

    @Test
    void nonMasterCannotCreateOutlet() {
        caller.populate(Role.CASHIER, "OUT-01");

        ApiException error = assertApiError(() -> service.create(new OutletCreateRequest("OUT-05", "Nama", "Alamat")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        verify(outlets, never()).save(any(Outlet.class));
    }

    @Test
    void anonymousCallerCannotCreateOutlet() {
        ApiException error = assertApiError(() -> service.create(new OutletCreateRequest("OUT-05", "Nama", "Alamat")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void listReturnsActiveOutlets() {
        when(outlets.findByDeletedFalseOrderByIdAsc()).thenReturn(List.of(
                new Outlet("OUT-01", "Dikichi 01", "Jl. A"), new Outlet("OUT-02", "Dikichi 02", "Jl. B")));

        List<OutletResponse> response = service.list();

        assertThat(response).extracting(OutletResponse::id).containsExactly("OUT-01", "OUT-02");
    }

    @Test
    void getReturnsOutletById() {
        when(outlets.findByIdAndDeletedFalse("OUT-01")).thenReturn(Optional.of(new Outlet("OUT-01", "Dikichi 01", "Jl. A")));

        assertThat(service.get("OUT-01").name()).isEqualTo("Dikichi 01");
    }

    @Test
    void getUnknownOutletReturnsNotFound() {
        when(outlets.findByIdAndDeletedFalse("OUT-404")).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.get("OUT-404"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }
}
