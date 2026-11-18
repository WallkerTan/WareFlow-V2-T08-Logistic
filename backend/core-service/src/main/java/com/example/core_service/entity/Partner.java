package com.example.core_service.entity;
import com.example.core_service.entity.enums.CompanyBusinessModel;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
@Entity @Table(name="partners") @Getter @Setter @NoArgsConstructor
public class Partner {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private String kind;
    private UUID companyId;
    @Column(nullable=false) private String name;
    @Enumerated(EnumType.STRING) private CompanyBusinessModel businessModel;
    private String email;
    private String phone;
    private String address;
    private boolean deleted;
    @Version private long version;
}
