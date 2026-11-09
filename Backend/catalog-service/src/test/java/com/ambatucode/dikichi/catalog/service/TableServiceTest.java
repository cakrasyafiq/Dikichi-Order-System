package com.ambatucode.dikichi.catalog.service;

import static com.ambatucode.dikichi.catalog.support.ApiAssertions.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.catalog.config.CallerContext;
import com.ambatucode.dikichi.catalog.dto.TableCreateRequest;
import com.ambatucode.dikichi.catalog.dto.TableResponse;
import com.ambatucode.dikichi.catalog.entity.DiningTable;
import com.ambatucode.dikichi.catalog.entity.Outlet;
import com.ambatucode.dikichi.catalog.entity.Role;
import com.ambatucode.dikichi.catalog.exception.ApiException;
import com.ambatucode.dikichi.catalog.repository.DiningTableRepository;
import com.ambatucode.dikichi.catalog.repository.OutletRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class TableServiceTest {

    private final DiningTableRepository tables = mock(DiningTableRepository.class);
    private final OutletRepository outlets = mock(OutletRepository.class);
    private final CallerContext caller = new CallerContext();
    private final TableService service = new TableService(tables, outlets, caller);

    @BeforeEach
    void setUp() {
        when(outlets.findByIdAndDeletedFalse("OUT-01")).thenReturn(Optional.of(new Outlet("OUT-01", "Dikichi 01", "Jl. A")));
        when(outlets.findByIdAndDeletedFalse("OUT-404")).thenReturn(Optional.empty());
        when(tables.save(any(DiningTable.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void listReturnsTablesOfTheOutlet() {
        when(tables.findByOutletIdAndDeletedFalseOrderByCodeAsc("OUT-01")).thenReturn(List.of(
                new DiningTable("OUT-01", "T-01"), new DiningTable("OUT-01", "T-02")));

        List<TableResponse> response = service.list("OUT-01");

        assertThat(response).extracting(TableResponse::code).containsExactly("T-01", "T-02");
    }

    @Test
    void listForUnknownOutletReturnsNotFound() {
        ApiException error = assertApiError(() -> service.list("OUT-404"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void masterCreatesTable() {
        caller.populate(Role.MASTER, null);
        when(tables.existsByOutletIdAndCodeAndDeletedFalse("OUT-01", "T-21")).thenReturn(false);

        TableResponse response = service.create("OUT-01", new TableCreateRequest("T-21"));

        assertThat(response.outletId()).isEqualTo("OUT-01");
        assertThat(response.code()).isEqualTo("T-21");
    }

    @Test
    void duplicateTableCodeIsRejected() {
        caller.populate(Role.MASTER, null);
        when(tables.existsByOutletIdAndCodeAndDeletedFalse("OUT-01", "T-01")).thenReturn(true);

        ApiException error = assertApiError(() -> service.create("OUT-01", new TableCreateRequest("T-01")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(error.getCode()).isEqualTo("DUPLICATE_TABLE_CODE");
        verify(tables, never()).save(any(DiningTable.class));
    }

    @Test
    void creatingTableInUnknownOutletReturnsNotFound() {
        caller.populate(Role.MASTER, null);

        ApiException error = assertApiError(() -> service.create("OUT-404", new TableCreateRequest("T-01")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void nonMasterCannotCreateTable() {
        caller.populate(Role.KITCHEN, "OUT-01");

        ApiException error = assertApiError(() -> service.create("OUT-01", new TableCreateRequest("T-21")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void masterDeletesTableWithSoftDelete() {
        caller.populate(Role.MASTER, null);
        DiningTable table = new DiningTable("OUT-01", "T-21");
        when(tables.findByOutletIdAndCodeAndDeletedFalse("OUT-01", "T-21")).thenReturn(Optional.of(table));

        service.delete("OUT-01", "T-21");

        assertThat(table).extracting("deleted").isEqualTo(true);
    }

    @Test
    void deletingUnknownTableReturnsNotFound() {
        caller.populate(Role.MASTER, null);
        when(tables.findByOutletIdAndCodeAndDeletedFalse("OUT-01", "T-99")).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.delete("OUT-01", "T-99"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    void deletingTableInUnknownOutletReturnsNotFound() {
        caller.populate(Role.MASTER, null);

        ApiException error = assertApiError(() -> service.delete("OUT-404", "T-01"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    void nonMasterCannotDeleteTable() {
        caller.populate(Role.CASHIER, "OUT-01");

        ApiException error = assertApiError(() -> service.delete("OUT-01", "T-01"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
    }

    @Test
    void anonymousCallerCannotDeleteTable() {
        ApiException error = assertApiError(() -> service.delete("OUT-01", "T-01"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
