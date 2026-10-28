package com.ambatucode.dikichi.catalog.controller;

import com.ambatucode.dikichi.catalog.dto.TableCreateRequest;
import com.ambatucode.dikichi.catalog.dto.TableResponse;
import com.ambatucode.dikichi.catalog.service.TableService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/outlets/{outletId}/tables")
public class TableController {

    private final TableService tableService;

    public TableController(TableService tableService) {
        this.tableService = tableService;
    }

    @GetMapping
    public List<TableResponse> list(@PathVariable String outletId) {
        return tableService.list(outletId);
    }

    @PostMapping
    public ResponseEntity<TableResponse> create(@PathVariable String outletId,
                                                @Valid @RequestBody TableCreateRequest request) {
        TableResponse created = tableService.create(outletId, request);
        URI location = URI.create("/api/v1/outlets/" + outletId + "/tables/" + created.code());
        return ResponseEntity.created(location).body(created);
    }

    @DeleteMapping("/{code}")
    public ResponseEntity<Void> delete(@PathVariable String outletId, @PathVariable String code) {
        tableService.delete(outletId, code);
        return ResponseEntity.noContent().build();
    }
}
