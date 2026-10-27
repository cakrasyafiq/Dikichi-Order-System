package com.ambatucode.dikichi.catalog.controller;

import com.ambatucode.dikichi.catalog.dto.InternalValidateRequest;
import com.ambatucode.dikichi.catalog.dto.InternalValidateResponse;
import com.ambatucode.dikichi.catalog.service.OrderValidationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/orders")
public class InternalValidationController {

    private final OrderValidationService validationService;

    public InternalValidationController(OrderValidationService validationService) {
        this.validationService = validationService;
    }

    @PostMapping("/validate")
    public InternalValidateResponse validate(@Valid @RequestBody InternalValidateRequest request) {
        return validationService.validate(request);
    }
}
