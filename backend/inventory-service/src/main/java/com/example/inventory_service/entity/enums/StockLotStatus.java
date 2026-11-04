package com.example.inventory_service.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum StockLotStatus {
    OK, NEAR_EXPIRY, EXPIRED, DAMAGED;

    @JsonValue
    public String toJson() { return name().toLowerCase(); }

    @JsonCreator
    public static StockLotStatus fromJson(String value) {
        return value == null ? null : valueOf(value.trim().toUpperCase().replace('-', '_'));
    }
}
