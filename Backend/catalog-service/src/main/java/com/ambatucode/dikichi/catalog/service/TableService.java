package com.ambatucode.dikichi.catalog.service;

import com.ambatucode.dikichi.catalog.config.CallerContext;
import com.ambatucode.dikichi.catalog.dto.ErrorDetail;
import com.ambatucode.dikichi.catalog.dto.TableCreateRequest;
import com.ambatucode.dikichi.catalog.dto.TableResponse;
import com.ambatucode.dikichi.catalog.entity.DiningTable;
import com.ambatucode.dikichi.catalog.entity.Role;
import com.ambatucode.dikichi.catalog.exception.ApiException;
import com.ambatucode.dikichi.catalog.mapper.CatalogMapper;
import com.ambatucode.dikichi.catalog.repository.DiningTableRepository;
import com.ambatucode.dikichi.catalog.repository.OutletRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TableService {

    private final DiningTableRepository tables;
    private final OutletRepository outlets;
    private final CallerContext caller;

    public TableService(DiningTableRepository tables, OutletRepository outlets, CallerContext caller) {
        this.tables = tables;
        this.outlets = outlets;
        this.caller = caller;
    }

    @Transactional(readOnly = true)
    public List<TableResponse> list(String outletId) {
        requireActiveOutlet(outletId);
        return tables.findByOutletIdAndDeletedFalseOrderByCodeAsc(outletId).stream()
                .map(CatalogMapper::toResponse)
                .toList();
    }

    @Transactional
    public TableResponse create(String outletId, TableCreateRequest request) {
        caller.requireRole(Role.MASTER);
        requireActiveOutlet(outletId);
        if (tables.existsByOutletIdAndCodeAndDeletedFalse(outletId, request.code())) {
            throw ApiException.conflict("DUPLICATE_TABLE_CODE", "Table code already exists in this outlet",
                    List.of(new ErrorDetail("code", "Table code already exists in this outlet")));
        }
        return CatalogMapper.toResponse(tables.save(new DiningTable(outletId, request.code())));
    }

    private void requireActiveOutlet(String outletId) {
        outlets.findByIdAndDeletedFalse(outletId).orElseThrow(() -> ApiException.notFound("Outlet not found"));
    }
}
