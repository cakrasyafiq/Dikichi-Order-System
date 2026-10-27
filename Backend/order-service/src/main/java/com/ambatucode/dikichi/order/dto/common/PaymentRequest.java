package com.ambatucode.dikichi.order.dto.common;

import com.ambatucode.dikichi.order.entity.PaymentMethod;
import jakarta.validation.constraints.NotNull;

public record PaymentRequest(@NotNull PaymentMethod paymentMethod, Long amountTendered) {
}
