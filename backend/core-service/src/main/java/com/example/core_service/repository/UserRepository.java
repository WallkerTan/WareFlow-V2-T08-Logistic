package com.example.core_service.repository;

import com.example.core_service.entity.User;
import com.example.core_service.entity.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    /** Lấy danh sách nhân viên theo company_id và role. */
    List<User> findByCompany_IdAndRole(UUID companyId, UserRole role);

    /** Lấy danh sách user theo role (dùng để tìm SYSTEM_ADMIN). */
    List<User> findByRoleOrderByCreatedAtAsc(UserRole role);

    /** Tìm user đầu tiên theo role. */
    Optional<User> findFirstByRole(UserRole role);
}
