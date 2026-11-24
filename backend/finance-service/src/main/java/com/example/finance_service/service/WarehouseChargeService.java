package com.example.finance_service.service;

import com.example.finance_service.dto.WarehouseChargeRequest;
import com.example.finance_service.entity.WarehouseCharge;
import com.example.finance_service.entity.enums.*;
import com.example.finance_service.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service @RequiredArgsConstructor
public class WarehouseChargeService {
    private final WarehouseChargeRepository charges;
    private final TransactionRepository transactions;
    private final WalletService wallets;

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
        wallets.settle(new WalletService.Payment(request.eventId(),request.companyId(),null,"EXPENSE",request.amount(),note),request.occurredAt());
        for(var type:java.util.List.of(TransactionType.EXPENSE,TransactionType.SYSTEM_FEE)) {
            transactions.findFirstByCompanyIdAndRefDocumentIdAndType(request.companyId(),request.eventId(),type).ifPresent(row->{
                row.setWarehouseId(request.warehouseId());row.setCategory(TransactionCategory.FEE);
            });
        }
    }

}
