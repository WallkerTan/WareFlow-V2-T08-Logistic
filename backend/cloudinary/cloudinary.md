Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET at runtime. Never commit credentials. Rotate any credentials previously committed.
POST /api/core/upload/image: Bearer token, multipart file and folder. Maximum 10MB, JPEG/PNG/GIF/WebP.
Allowed folders: general, avatars, companies, warehouses, products.
Save secureUrl to profile/product; retain publicId for deletion.
DELETE /api/core/upload/image?publicId=... checks uploader ownership, company admin scope or system admin.
Legacy images require ownership migration before deletion through this API.
