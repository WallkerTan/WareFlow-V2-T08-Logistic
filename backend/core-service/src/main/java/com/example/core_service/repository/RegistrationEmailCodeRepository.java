package com.example.core_service.repository;

import com.example.core_service.entity.RegistrationEmailCode;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface RegistrationEmailCodeRepository extends JpaRepository<RegistrationEmailCode, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from RegistrationEmailCode c where c.email = :email")
    Optional<RegistrationEmailCode> lockByEmail(String email);
}
