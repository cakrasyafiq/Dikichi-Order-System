package com.ambatucode.dikichi.order.dto.v2;

// WHY: payment status is a view concern of API v2, derived from the presence of a mock payment row
public enum PaymentStatus {
    UNPAID,
    PAID
}
