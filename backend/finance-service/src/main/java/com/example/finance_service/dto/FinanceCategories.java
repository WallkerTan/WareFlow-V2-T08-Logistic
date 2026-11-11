package com.example.finance_service.dto;

import com.example.finance_service.entity.enums.TransactionCategory;
import java.math.BigDecimal;
import java.util.List;

public record FinanceCategories(String period, String timezone, List<Item> items) {
    public record Item(TransactionCategory category, BigDecimal income, BigDecimal expense, BigDecimal systemFee, BigDecimal net) {}
}
