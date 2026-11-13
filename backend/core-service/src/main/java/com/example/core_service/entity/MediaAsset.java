package com.example.core_service.entity;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
@Entity @Table(name="media_assets") @Getter @Setter @NoArgsConstructor
public class MediaAsset {
    @Id @Column(length=512) private String publicId;
    @Column(nullable=false) private UUID ownerId;
    private UUID companyId;
    @Column(length=2048) private String secureUrl;
    @Version private long version;
}
