package com.example.finance_service.service;

import com.example.finance_service.dto.WarehouseChargeRequest;
import com.example.finance_service.entity.Transaction;
import com.example.finance_service.entity.WarehouseCharge;
import com.example.finance_service.entity.enums.*;
import com.example.finance_service.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Service @RequiredArgsConstructor
public class WarehouseChargeService {
    private final WarehouseChargeRepository charges;
    private final TransactionRepository transactions;

    @Transactional
    public void record(WarehouseChargeRequest request) {
        var existing = charges.findById(request.eventId());
        if (existing.isPresent()) {
            var charge = existing.get();
            if (!charge.getCompanyId().equals(request.companyId()) || !charge.getWarehouseId().equals(request.warehouseId())
                    || charge.getAmount().compareTo(request.amount()) != 0 || !charge.getTransactionType().equals(request.transactionType()))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Giao dịch kho đã được ghi sổ với nội dung khác");
            return;
        }
        // A concurrent duplicate fails this insert and rolls back; its retry finds the completed charge.
        charges.saveAndFlush(new WarehouseCharge(request));
        String note = (request.transactionType().equals("BUY") ? "Mua kho" : "Thuê kho") + " · " + request.eventId();
        ledger(request, TransactionType.EXPENSE, request.amount(), note);
        BigDecimal fee = request.amount().multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP);
        if (fee.signum() > 0) ledger(request, TransactionType.SYSTEM_FEE, fee, "Phí nền tảng 5% · " + note);
    }

    private void ledger(WarehouseChargeRequest request, TransactionType type, BigDecimal amount, String note) {
        if (transactions.existsByCompanyIdAndRefDocumentIdAndType(request.companyId(), request.eventId(), type)) return;
        transactions.save(Transaction.builder().companyId(request.companyId()).warehouseId(request.warehouseId())
                .type(type).category(TransactionCategory.FEE).amount(amount.setScale(2, RoundingMode.HALF_UP))
                .refDocumentId(request.eventId()).note(note).createdAt(request.occurredAt()).build());
    }
}
