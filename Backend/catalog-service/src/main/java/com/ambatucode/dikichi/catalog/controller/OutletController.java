package com.ambatucode.dikichi.catalog.controller;

import com.ambatucode.dikichi.catalog.dto.OutletCreateRequest;
import com.ambatucode.dikichi.catalog.dto.OutletReplaceRequest;
import com.ambatucode.dikichi.catalog.dto.OutletResponse;
import com.ambatucode.dikichi.catalog.service.OutletService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/outlets")
public class OutletController {

    private final OutletService outletService;

    public OutletController(OutletService outletService) {
        this.outletService = outletService;
    }

    @GetMapping
    public List<OutletResponse> list() {
        return outletService.list();
    }

    @GetMapping("/{outletId}")
    public OutletResponse get(@PathVariable String outletId) {
        return outletService.get(outletId);
    }

    @PostMapping
    public ResponseEntity<OutletResponse> create(@Valid @RequestBody OutletCreateRequest request) {
        OutletResponse created = outletService.create(request);
        return ResponseEntity.created(URI.create("/api/v1/outlets/" + created.id())).body(created);
    }

    @PutMapping("/{outletId}")
    public OutletResponse replace(@PathVariable String outletId,
                                  @Valid @RequestBody OutletReplaceRequest request) {
        return outletService.replace(outletId, request);
    }

    @DeleteMapping("/{outletId}")
    public ResponseEntity<Void> delete(@PathVariable String outletId) {
        outletService.delete(outletId);
        return ResponseEntity.noContent().build();
    }
}
