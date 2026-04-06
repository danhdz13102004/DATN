package com.recruitpro.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.UUID;

/**
 * MinIO / S3-compatible storage abstraction.
 * All file operations go through this single service per backend.md rules.
 */
@Slf4j
@Service
public class StorageService {

    @Value("${app.minio.endpoint}")
    private String endpoint;

    @Value("${app.minio.access-key}")
    private String accessKey;

    @Value("${app.minio.secret-key}")
    private String secretKey;

    @Value("${app.minio.bucket}")
    private String bucket;

    @Value("${app.minio.use-ssl}")
    private boolean useSsl;

    private S3Client s3Client;
    private S3Presigner presigner;

    @PostConstruct
    public void init() {
        URI endpointUri = URI.create(endpoint);
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);

        this.s3Client = S3Client.builder()
                .endpointOverride(endpointUri)
                .region(Region.US_EAST_1)          // MinIO requires a region but ignores it
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .forcePathStyle(true)               // Required for MinIO
                .build();

        this.presigner = S3Presigner.builder()
                .endpointOverride(endpointUri)
                .region(Region.US_EAST_1)
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();

        log.info("StorageService initialized (endpoint={})", endpoint);
    }

    /**
     * Upload a file and return its storage key.
     *
     * @param folder   Logical folder (e.g., "resumes", "avatars", "logos")
     * @param fileName Original file name
     * @param content  File content stream
     * @param size     Content length in bytes
     * @param mimeType MIME type (e.g., application/pdf)
     * @return The generated storage key
     */
    public String upload(String folder, String fileName, InputStream content, long size, String mimeType) {
        // Extract original extension (e.g., ".png" or ".pdf")
        String extension = "";
        if (fileName != null && fileName.contains(".")) {
            extension = fileName.substring(fileName.lastIndexOf("."));
        }
        
        // Generate a completely random filename. 
        // e.g., folder/62908f51-b8ae-4ae3-bb9f-86ee2b3149ca.png
        String randomFileName = UUID.randomUUID().toString() + extension;
        String key = folder + "/" + randomFileName;

        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(mimeType)
                        .build(),
                RequestBody.fromInputStream(content, size)
        );

        log.info("Uploaded file: {} ({} bytes)", key, size);
        return key;
    }

    /**
     * Generate a pre-signed download URL (valid for 1 hour).
     */
    public String getDownloadUrl(String key) {
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofHours(1))
                .getObjectRequest(builder -> builder.bucket(bucket).key(key))
                .build();

        return presigner.presignGetObject(presignRequest).url().toString();
    }

    /**
     * Download a stored object and return its raw bytes.
     * Used for server-side processing (e.g. PDF text extraction).
     *
     * @param key Storage key returned by {@link #upload}
     * @return File contents as a byte array
     */
    public byte[] downloadAsBytes(String key) {
        return s3Client.getObjectAsBytes(
                GetObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .build()
        ).asByteArray();
    }

    /**
     * Delete a file by key.
     */
    public void delete(String key) {
        s3Client.deleteObject(
                DeleteObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .build()
        );
        log.info("Deleted file: {}", key);
    }

    /**
     * Check if a file exists.
     */
    public boolean exists(String key) {
        try {
            s3Client.headObject(
                    HeadObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .build()
            );
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        }
    }

    /**
     * Generate a public, non-expiring URL for a given object key (e.g. logos).
     * Assumes the MinIO bucket has a public read policy.
     */
    public String getPublicUrl(String key) {
        if (key == null || key.trim().isEmpty()) {
            return null;
        }
        // If it's already a full URL (e.g., placeholder or external image), return it as is
        if (key.startsWith("http://") || key.startsWith("https://")) {
            return key;
        }
        
        return "http://127.0.0.1:9000" + "/" + bucket + "/" + key;
    }
}
