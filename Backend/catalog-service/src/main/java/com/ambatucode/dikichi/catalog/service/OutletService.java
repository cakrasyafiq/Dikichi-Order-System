package com.ambatucode.dikichi.catalog.service;

import com.ambatucode.dikichi.catalog.config.CallerContext;
import com.ambatucode.dikichi.catalog.dto.ErrorDetail;
import com.ambatucode.dikichi.catalog.dto.OutletCreateRequest;
import com.ambatucode.dikichi.catalog.dto.OutletResponse;
import com.ambatucode.dikichi.catalog.entity.Outlet;
import com.ambatucode.dikichi.catalog.entity.Role;
import com.ambatucode.dikichi.catalog.exception.ApiException;
import com.ambatucode.dikichi.catalog.mapper.CatalogMapper;
import com.ambatucode.dikichi.catalog.repository.OutletRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OutletService {

    private final OutletRepository outlets;
    private final CallerContext caller;

    public OutletService(OutletRepository outlets, CallerContext caller) {
        this.outlets = outlets;
        this.caller = caller;
    }

    @Transactional(readOnly = true)
    public List<OutletResponse> list() {
        return outlets.findByDeletedFalseOrderByIdAsc().stream().map(CatalogMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public OutletResponse get(String outletId) {
        return CatalogMapper.toResponse(requireActive(outletId));
    }

    @Transactional
    public OutletResponse create(OutletCreateRequest request) {
        caller.requireRole(Role.MASTER);
        // WHY: existsById also sees soft-deleted rows because the outlet id is the primary key
        if (outlets.existsById(request.id())) {
            throw ApiException.conflict("DUPLICATE_OUTLET_ID", "Outlet id already exists",
                    List.of(new ErrorDetail("id", "Outlet id already exists")));
        }
        Outlet saved = outlets.save(new Outlet(request.id(), request.name().strip(), request.address().strip()));
        return CatalogMapper.toResponse(saved);
    }

    Outlet requireActive(String outletId) {
        return outlets.findByIdAndDeletedFalse(outletId)
                .orElseThrow(() -> ApiException.notFound("Outlet not found"));
    }
}
