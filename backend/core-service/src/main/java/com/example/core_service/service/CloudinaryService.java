package com.example.core_service.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.example.core_service.dto.response.CloudinaryUploadResponse;
import com.example.core_service.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;
    private final com.example.core_service.repository.MediaAssetRepository assets;
    private final com.example.core_service.config.CloudinaryProperties properties;

    private void configured() {
        if (properties.getCloudName() == null || properties.getCloudName().isBlank()
                || properties.getApiKey() == null || properties.getApiKey().isBlank()
                || properties.getApiSecret() == null || properties.getApiSecret().isBlank())
            throw new ApiException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Chưa cấu hình Cloudinary");
    }

    @org.springframework.transaction.annotation.Transactional
    public CloudinaryUploadResponse uploadImage(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Vui lòng chọn file ảnh hợp lệ");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw ApiException.badRequest("Định dạng file không được hỗ trợ, chỉ chấp nhận file ảnh");
        }

        if (file.getSize() > 10L * 1024 * 1024) throw ApiException.badRequest("Ảnh tối đa 10MB");
        String selected = folder == null || folder.isBlank() ? "general" : folder.trim();
        if (!java.util.Set.of("general", "avatars", "companies", "warehouses", "products").contains(selected))
            throw ApiException.badRequest("Thư mục ảnh không hợp lệ");
        configured();
        String targetFolder = "wareflow/" + selected + "/" + com.example.core_service.security.SecurityUtils.getCurrentUserId();

        try {
            byte[] data = file.getBytes();
            if (!image(data)) throw ApiException.badRequest("Chỉ nhận nội dung JPEG, PNG, GIF hoặc WebP");
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    data,
                    ObjectUtils.asMap(
                            "folder", targetFolder,
                            "resource_type", "image"
                    )
            );

            String url = (String) uploadResult.get("url");
            String secureUrl = (String) uploadResult.get("secure_url");
            String publicId = (String) uploadResult.get("public_id");
            String format = (String) uploadResult.get("format");
            Long bytes = uploadResult.get("bytes") instanceof Number num ? num.longValue() : 0L;
            if (publicId == null || secureUrl == null) throw ApiException.internal("Cloudinary trả về dữ liệu không hợp lệ");
            var asset = new com.example.core_service.entity.MediaAsset();
            asset.setPublicId(publicId); asset.setOwnerId(com.example.core_service.security.SecurityUtils.getCurrentUserId());
            asset.setCompanyId(com.example.core_service.security.SecurityUtils.getCurrentCompanyId()); asset.setSecureUrl(secureUrl);
            try { assets.saveAndFlush(asset); }
            catch (RuntimeException ex) {
                try { cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap()); }
                catch (Exception cleanup) { log.error("Cannot clean up orphan asset {}", publicId, cleanup); }
                throw ex;
            }

            log.info("Uploaded image to Cloudinary successfully: publicId={}, secureUrl={}", publicId, secureUrl);
            return new CloudinaryUploadResponse(url, secureUrl, publicId, format, bytes);

        } catch (IOException e) {
            log.error("Failed to upload image to Cloudinary", e);
            throw ApiException.internal("Tải ảnh lên Cloudinary thất bại");
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteImage(String publicId) {
        if (publicId == null || publicId.isBlank()) {
            throw ApiException.badRequest("Mã publicId không được để trống");
        }

        var asset = assets.lock(publicId.trim()).orElseThrow(() -> ApiException.notFound("Không tìm thấy ảnh đã đăng ký"));
        var role = com.example.core_service.security.SecurityUtils.getCurrentUserRole();
        boolean companyAdmin = role == com.example.core_service.entity.enums.UserRole.COMPANY_ADMIN
                && asset.getCompanyId() != null && asset.getCompanyId().equals(com.example.core_service.security.SecurityUtils.getCurrentCompanyId());
        if (!asset.getOwnerId().equals(com.example.core_service.security.SecurityUtils.getCurrentUserId())
                && !companyAdmin && role != com.example.core_service.entity.enums.UserRole.SYSTEM_ADMIN)
            throw ApiException.forbidden("Không có quyền xóa ảnh này");
        configured();
        try {
            Map<?, ?> result = cloudinary.uploader().destroy(publicId.trim(), ObjectUtils.asMap("invalidate", true));
            if (!java.util.Set.of("ok", "not found").contains(String.valueOf(result.get("result"))))
                throw ApiException.internal("Cloudinary chưa xóa được ảnh");
            assets.delete(asset);
            log.info("Deleted image from Cloudinary: publicId={}, result={}", publicId, result);
        } catch (IOException e) {
            log.error("Failed to delete image from Cloudinary: publicId={}", publicId, e);
            throw ApiException.internal("Xóa ảnh trên Cloudinary thất bại");
        }
    }
    static boolean image(byte[] d) {
        if (d.length < 12) return false;
        return (d[0] == (byte)0xff && d[1] == (byte)0xd8 && d[2] == (byte)0xff)
                || (d[0] == (byte)0x89 && d[1] == 'P' && d[2] == 'N' && d[3] == 'G' && d[4] == 13 && d[5] == 10 && d[6] == 26 && d[7] == 10)
                || (d[0] == 'G' && d[1] == 'I' && d[2] == 'F' && d[3] == '8' && (d[4] == '7' || d[4] == '9') && d[5] == 'a')
                || (d[0] == 'R' && d[1] == 'I' && d[2] == 'F' && d[3] == 'F' && d[8] == 'W' && d[9] == 'E' && d[10] == 'B' && d[11] == 'P');
    }
}
