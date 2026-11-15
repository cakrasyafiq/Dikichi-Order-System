package com.ambatucode.dikichi.order.dto.v2;

import com.ambatucode.dikichi.order.entity.PaymentMethod;

public record V2PaymentSummary(long totalAmount, PaymentStatus paymentStatus, PaymentMethod paymentMethod,
                               Long amountTendered, Long change) {
}
