package com.ambatucode.dikichi.catalog.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.ambatucode.dikichi.catalog.exception.ApiException;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;

public final class ApiAssertions {

    private ApiAssertions() {
    }

    public static ApiException assertApiError(ThrowingCallable action) {
        Throwable thrown = catchThrowable(action);
        assertThat(thrown).isInstanceOf(ApiException.class);
        return (ApiException) thrown;
    }
}
