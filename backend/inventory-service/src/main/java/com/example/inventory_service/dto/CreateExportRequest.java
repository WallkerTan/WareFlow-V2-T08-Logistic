package com.example.inventory_service.dto;

import com.example.inventory_service.entity.enums.StockDocumentType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateExportRequest(
        @NotNull StockDocumentType type,
        UUID targetWarehouseId,
        @NotNull @Size(max = 100) List<@NotNull @Valid Line> lines,
        @Size(max = 2000) String note, @Size(max=200) String recipientName,@Size(max=32) String recipientPhone,@Size(max=500) String recipientAddress) {
    public CreateExportRequest(StockDocumentType type, UUID target,List<Line> lines,String note){this(type,target,lines,note,null,null,null); }
    public record Line(UUID lotId,
                       @NotNull @DecimalMin(value = "0", inclusive = false)
                       @Digits(integer = 10, fraction = 2) BigDecimal quantity,
                       UUID targetProductId,@DecimalMin("0") @DecimalMax("500") @Digits(integer=3,fraction=2) BigDecimal pricePercent,
                       UUID productId) {
        public Line(UUID lotId, BigDecimal quantity, UUID targetProductId, BigDecimal pricePercent) {
            this(lotId, quantity, targetProductId, pricePercent, null);
        }
        public Line(UUID lotId,BigDecimal quantity,UUID targetProductId){this(lotId,quantity,targetProductId,null,null);}
    }
}
