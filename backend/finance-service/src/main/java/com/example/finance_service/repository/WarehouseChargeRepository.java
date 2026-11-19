package com.example.finance_service.repository;

import com.example.finance_service.entity.WarehouseCharge;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface WarehouseChargeRepository extends JpaRepository<WarehouseCharge, UUID> { }
