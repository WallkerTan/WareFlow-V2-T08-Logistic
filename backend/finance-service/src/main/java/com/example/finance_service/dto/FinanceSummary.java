package com.example.finance_service.dto;

import java.math.BigDecimal;

public record FinanceSummary(BigDecimal income, BigDecimal expense, BigDecimal systemFee, BigDecimal net) { }
