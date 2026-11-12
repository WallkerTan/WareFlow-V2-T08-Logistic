package com.example.finance_service.repository;
import com.example.finance_service.entity.WarehouseChargeReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface WarehouseChargeReceiptRepository extends JpaRepository<WarehouseChargeReceipt,UUID>{}
