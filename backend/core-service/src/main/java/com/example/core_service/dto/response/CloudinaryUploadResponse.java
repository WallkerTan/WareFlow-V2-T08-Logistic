package com.example.core_service.dto.response;

public record CloudinaryUploadResponse(
        String url,
        String secureUrl,
        String publicId,
        String format,
        Long bytes
) {}

