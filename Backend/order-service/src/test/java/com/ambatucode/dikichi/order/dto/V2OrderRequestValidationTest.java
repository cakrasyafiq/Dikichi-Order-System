package com.ambatucode.dikichi.order.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.ambatucode.dikichi.order.dto.common.OrderItemRequest;
import com.ambatucode.dikichi.order.dto.v2.V2OrderRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class V2OrderRequestValidationTest {

    private static final UUID MENU_MIE = UUID.fromString("11111111-0000-4000-8000-000000000001");
    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void createValidator() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        factory.close();
    }

    private static V2OrderRequest request(V2OrderRequest.Customer customer, V2OrderRequest.Location location,
                                          List<OrderItemRequest> items) {
        return new V2OrderRequest(customer, location, items);
    }

    private static Set<String> invalidPaths(V2OrderRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }

    private static final List<OrderItemRequest> ONE_ITEM = List.of(new OrderItemRequest(MENU_MIE, 2));
    private static final V2OrderRequest.Location VALID_LOCATION = new V2OrderRequest.Location("OUT-01", "T-01");

    @Test
    void validNestedRequestHasNoViolations() {
        assertThat(invalidPaths(request(new V2OrderRequest.Customer("Budi"), VALID_LOCATION, ONE_ITEM))).isEmpty();
    }

    @Test
    void flatV1StyleBodyIsRejectedBecauseCustomerAndLocationAreMissing() {
        assertThat(invalidPaths(request(null, null, ONE_ITEM))).containsExactlyInAnyOrder("customer", "location");
    }

    @Test
    void blankCustomerNameIsRejectedWithNestedPath() {
        assertThat(invalidPaths(request(new V2OrderRequest.Customer("   "), VALID_LOCATION, ONE_ITEM)))
                .containsExactly("customer.name");
    }

    @Test
    void customerNameLongerThanFiftyCharactersIsRejected() {
        String longName = "a".repeat(51);
        assertThat(invalidPaths(request(new V2OrderRequest.Customer(longName), VALID_LOCATION, ONE_ITEM)))
                .containsExactly("customer.name");
    }

    @Test
    void malformedOutletAndTableCodesAreRejectedWithNestedPaths() {
        V2OrderRequest.Location bad = new V2OrderRequest.Location("OUTLET-1", "TABLE-1");
        assertThat(invalidPaths(request(new V2OrderRequest.Customer("Budi"), bad, ONE_ITEM)))
                .containsExactlyInAnyOrder("location.outletId", "location.tableCode");
    }

    @Test
    void emptyItemListIsRejected() {
        assertThat(invalidPaths(request(new V2OrderRequest.Customer("Budi"), VALID_LOCATION, List.of())))
                .containsExactly("items");
    }

    @Test
    void invalidQuantityInsideItemsIsReported() {
        List<OrderItemRequest> items = List.of(new OrderItemRequest(MENU_MIE, 0));
        assertThat(invalidPaths(request(new V2OrderRequest.Customer("Budi"), VALID_LOCATION, items)))
                .anyMatch(path -> path.startsWith("items[0]") && path.endsWith("quantity"));
    }
}
