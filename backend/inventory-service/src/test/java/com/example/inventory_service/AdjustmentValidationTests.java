package com.example.inventory_service;

import com.example.inventory_service.dto.CreateAdjustmentRequest;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class AdjustmentValidationTests {
    @Test void adjustmentAllowsBothDirectionsButRejectsZeroAndMissingQuantity() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            for (String value : List.of("-2.50", "3.00")) {
                var request = new CreateAdjustmentRequest(List.of(new CreateAdjustmentRequest.Line(UUID.randomUUID(), new BigDecimal(value))), null);
                assertTrue(validator.validate(request).isEmpty());
            }
            for (BigDecimal value : new BigDecimal[] {BigDecimal.ZERO, null}) {
                var request = new CreateAdjustmentRequest(List.of(new CreateAdjustmentRequest.Line(UUID.randomUUID(), value)), null);
                assertFalse(validator.validate(request).isEmpty());
            }
        }
    }
}
