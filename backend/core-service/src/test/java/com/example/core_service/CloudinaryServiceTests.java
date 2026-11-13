package com.example.core_service;
import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.example.core_service.config.CloudinaryProperties;
import com.example.core_service.entity.MediaAsset;
import com.example.core_service.entity.enums.UserRole;
import com.example.core_service.exception.ApiException;
import com.example.core_service.repository.MediaAssetRepository;
import com.example.core_service.security.UserPrincipal;
import com.example.core_service.service.CloudinaryService;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CloudinaryServiceTests {
    Cloudinary cloud=mock(Cloudinary.class);
    Uploader uploader=mock(Uploader.class);
    MediaAssetRepository assets=mock(MediaAssetRepository.class);
    CloudinaryProperties properties=new CloudinaryProperties();
    CloudinaryService service;
    UUID user=UUID.randomUUID(),company=UUID.randomUUID();
    @BeforeEach void setup(){
        properties.setCloudName("test");properties.setApiKey("key");properties.setApiSecret("secret");
        service=new CloudinaryService(cloud,assets,properties);when(cloud.uploader()).thenReturn(uploader);
        var principal=UserPrincipal.builder().id(user).companyId(company).role(UserRole.WAREHOUSE_MANAGER).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
    }
    @AfterEach void cleanup(){SecurityContextHolder.clearContext();}
    @Test void uploadStoresOwnerAndReturnsSecureUrl() throws Exception {
        byte[] png={(byte)137,80,78,71,13,10,26,10,0,0,0,0};
        when(uploader.upload(any(byte[].class),anyMap())).thenReturn(Map.of("public_id","wareflow/products/test","secure_url","https://example.test/image.png","url","https://example.test/image.png","format","png","bytes",12));
        var result=service.uploadImage(new MockMultipartFile("file","image.png","image/png",png),"products");
        assertEquals("https://example.test/image.png",result.secureUrl());
        verify(assets).saveAndFlush(argThat(a->a.getOwnerId().equals(user)&&a.getCompanyId().equals(company)));
    }
    @Test void forgedMimeAndUnsafeFolderAreRejectedBeforeRemoteUpload() {
        var file=new MockMultipartFile("file","fake.png","image/png","<script>bad</script>".getBytes());
        assertEquals(400,assertThrows(ApiException.class,()->service.uploadImage(file,"products")).getStatus().value());
        assertEquals(400,assertThrows(ApiException.class,()->service.uploadImage(file,"../another-company")).getStatus().value());verifyNoInteractions(uploader);
    }
    @Test void missingConfigurationIsExplicit() {
        properties.setApiSecret("");
        assertEquals(503,assertThrows(ApiException.class,()->service.uploadImage(new MockMultipartFile("file","a.png","image/png",new byte[12]),"general")).getStatus().value());
    }
    @Test void otherUsersCannotDeleteAsset(){
        var a=new MediaAsset();a.setPublicId("foreign");a.setOwnerId(UUID.randomUUID());a.setCompanyId(company);when(assets.lock("foreign")).thenReturn(Optional.of(a));
        assertEquals(403,assertThrows(ApiException.class,()->service.deleteImage("foreign")).getStatus().value());verifyNoInteractions(uploader);
    }
    @Test void deletionFailureDoesNotRemoveOwnershipRecord() throws Exception {
        var a=new MediaAsset();a.setPublicId("own");a.setOwnerId(user);when(assets.lock("own")).thenReturn(Optional.of(a));
        when(uploader.destroy(eq("own"),anyMap())).thenReturn(Map.of("result","error"));
        assertThrows(ApiException.class,()->service.deleteImage("own"));verify(assets,never()).delete(any());
    }
}
