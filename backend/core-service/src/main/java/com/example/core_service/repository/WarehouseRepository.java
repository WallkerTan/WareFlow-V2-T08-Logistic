package com.example.core_service.repository;

import com.example.core_service.entity.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface WarehouseRepository extends JpaRepository<Warehouse, UUID>, JpaSpecificationExecutor<Warehouse> {

    @org.springframework.data.jpa.repository.Query(value="select exists(select 1 from warehouses where handover->>'managerId' = :managerId)", nativeQuery=true)
    boolean hasAssignedManager(String managerId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select w from Warehouse w where w.id=:id")
    java.util.Optional<Warehouse> locked(UUID id);

    boolean existsByNameIgnoreCase(String name);
}

