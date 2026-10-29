package com.example.core_service.controller;

import com.example.core_service.dto.response.CloudinaryUploadResponse;
import com.example.core_service.service.CloudinaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/upload")
@RequiredArgsConstructor
public class UploadController {

    private final CloudinaryService cloudinaryService;

    /**
     * Tải ảnh lên Cloudinary
     *
     * @param file   File ảnh (multipart/form-data)
     * @param folder Thư mục phân loại (vd: avatars, companies, warehouses, products)
     * @return CloudinaryUploadResponse chứa secureUrl và publicId
     */
    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public CloudinaryUploadResponse uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "general") String folder
    ) {
        return cloudinaryService.uploadImage(file, folder);
    }

    /**
     * Xóa ảnh khỏi Cloudinary bằng publicId
     */
    @DeleteMapping("/image")
    public Map<String, String> deleteImage(@RequestParam("publicId") String publicId) {
        cloudinaryService.deleteImage(publicId);
        return Map.of("message", "Đã xóa ảnh thành công", "publicId", publicId);
    }
}

