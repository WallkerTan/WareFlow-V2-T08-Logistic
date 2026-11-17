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

    public CloudinaryUploadResponse uploadImage(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Vui lòng chọn file ảnh hợp lệ");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw ApiException.badRequest("Định dạng file không được hỗ trợ, chỉ chấp nhận file ảnh");
        }

        String targetFolder = (folder == null || folder.isBlank()) ? "wareflow/general" : "wareflow/" + folder.trim();

        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
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

            log.info("Uploaded image to Cloudinary successfully: publicId={}, secureUrl={}", publicId, secureUrl);
            return new CloudinaryUploadResponse(url, secureUrl, publicId, format, bytes);

        } catch (IOException e) {
            log.error("Failed to upload image to Cloudinary", e);
            throw ApiException.internal("Tải ảnh lên máy chủ thất bại: " + e.getMessage());
        }
    }

    public void deleteImage(String publicId) {
        if (publicId == null || publicId.isBlank()) {
            throw ApiException.badRequest("Mã publicId không được để trống");
        }

        try {
            Map<?, ?> result = cloudinary.uploader().destroy(publicId.trim(), ObjectUtils.emptyMap());
            log.info("Deleted image from Cloudinary: publicId={}, result={}", publicId, result);
        } catch (IOException e) {
            log.error("Failed to delete image from Cloudinary: publicId={}", publicId, e);
            throw ApiException.internal("Xóa ảnh trên máy chủ thất bại: " + e.getMessage());
        }
    }
}

