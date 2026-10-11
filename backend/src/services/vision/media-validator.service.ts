import { logger } from "../../utils/logger.js";

export type SupportedImageMimeType = "image/jpeg" | "image/png";

export type SupportedDocumentMimeType = SupportedImageMimeType | "application/pdf" | "image/webp";

export interface MediaValidationResult {
    valid: boolean;
    mimeType?: SupportedDocumentMimeType;
    sizeBytes: number;
    errorCode?: "OVERSIZED" | "EMPTY_OR_TRUNCATED" | "INVALID_MAGIC_BYTES" | "MIME_MISMATCH" | "UNSUPPORTED_FORMAT";
    errorMessage?: string;
}

export const MAX_MEDIA_SIZE_BYTES = 5 * 1024 * 1024; // 5,242,880 bytes (5MB)
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10,485,760 bytes (10MB)
export const MIN_MEDIA_SIZE_BYTES = 100; // 100 bytes minimum to reject empty/truncated files
export class MediaValidatorService {
    /**
     * Validates image buffer by verifying file signature (magic bytes) and size boundaries.
     * Never relies solely on declared Content-Type / MIME.
     */
    static validateImageBuffer(buffer: Buffer, declaredMime?: string) {
        if (!buffer || !Buffer.isBuffer(buffer)) {
            return {
                valid: false,
                sizeBytes: 0,
                errorCode: "EMPTY_OR_TRUNCATED",
                errorMessage: "Missing or invalid image buffer"
            };
        }
        const sizeBytes = buffer.length;
        // 1. Minimum Size Check
        if (sizeBytes < MIN_MEDIA_SIZE_BYTES) {
            logger.warn({ sizeBytes }, "Media validation rejected: file too small or empty");
            return {
                valid: false,
                sizeBytes,
                errorCode: "EMPTY_OR_TRUNCATED",
                errorMessage: "Image file is empty or severely truncated"
            };
        }
        // 2. Maximum Size Check (5MB)
        if (sizeBytes > MAX_MEDIA_SIZE_BYTES) {
            logger.warn({ sizeBytes, maxAllowed: MAX_MEDIA_SIZE_BYTES }, "Media validation rejected: file exceeds 5MB limit");
            return {
                valid: false,
                sizeBytes,
                errorCode: "OVERSIZED",
                errorMessage: "Image file exceeds maximum allowed limit of 5MB"
            };
        }
        // 3. Inspect Magic Bytes
        const detectedMime = this.detectMagicBytes(buffer);
        if (!detectedMime || (detectedMime !== "image/jpeg" && detectedMime !== "image/png")) {
            logger.warn({ sizeBytes, declaredMime }, "Media validation rejected: invalid magic bytes or unsupported format");
            return {
                valid: false,
                sizeBytes,
                errorCode: "INVALID_MAGIC_BYTES",
                errorMessage: "Unsupported or corrupt image format. Only JPEG and PNG are permitted."
            };
        }
        // 4. Validate Declared MIME match if provided
        if (declaredMime) {
            const normalizedDeclared = declaredMime.toLowerCase().trim();
            const matchesJpeg = detectedMime === "image/jpeg" && (normalizedDeclared === "image/jpeg" || normalizedDeclared === "image/jpg");
            const matchesPng = detectedMime === "image/png" && normalizedDeclared === "image/png";
            if (!matchesJpeg && !matchesPng) {
                logger.warn({ declaredMime, detectedMime }, "Media validation rejected: declared MIME does not match actual magic bytes");
                return {
                    valid: false,
                    sizeBytes,
                    errorCode: "MIME_MISMATCH",
                    errorMessage: "Image content does not match declared MIME type"
                };
            }
        }
        return {
            valid: true,
            mimeType: detectedMime,
            sizeBytes
        };
    }
    /**
     * Phase 10: Validates travel documents (Images & PDFs up to 10MB).
     */
    static validateDocumentBuffer(buffer: Buffer, declaredMime: string) {
        if (!buffer || !Buffer.isBuffer(buffer)) {
            return { valid: false, sizeBytes: 0, errorCode: "EMPTY_OR_TRUNCATED", errorMessage: "Invalid buffer" };
        }
        const sizeBytes = buffer.length;
        if (sizeBytes < MIN_MEDIA_SIZE_BYTES) {
            return { valid: false, sizeBytes, errorCode: "EMPTY_OR_TRUNCATED", errorMessage: "File too small" };
        }
        if (sizeBytes > MAX_DOCUMENT_SIZE_BYTES) {
            return { valid: false, sizeBytes, errorCode: "OVERSIZED", errorMessage: "Document exceeds 10MB limit" };
        }
        const detectedMime = this.detectMagicBytes(buffer);
        if (!detectedMime) {
            return { valid: false, sizeBytes, errorCode: "INVALID_MAGIC_BYTES", errorMessage: "Unsupported document format" };
        }
        return { valid: true, mimeType: detectedMime, sizeBytes };
    }
    /**
     * Detects MIME type from file header signature.
     * JPEG: FF D8 FF
     * PNG: 89 50 4E 47 0D 0A 1A 0A
     * WebP: RIFF ... WEBP
     * PDF: %PDF (25 50 44 46)
     */
    static detectMagicBytes(buffer: Buffer) {
        if (buffer.length < 4)
            return null;
        // PDF signature: %PDF (25 50 44 46)
        if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
            return "application/pdf";
        }
        // JPEG signature: FF D8 FF
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return "image/jpeg";
        }
        // PNG signature: 89 50 4E 47 0D 0A 1A 0A
        if (buffer.length >= 8 &&
            buffer[0] === 0x89 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x4E &&
            buffer[3] === 0x47 &&
            buffer[4] === 0x0D &&
            buffer[5] === 0x0A &&
            buffer[6] === 0x1A &&
            buffer[7] === 0x0A) {
            return "image/png";
        }
        // WebP signature: RIFF ... WEBP
        if (buffer.length >= 12 &&
            buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
            buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
            return "image/webp";
        }
        return null;
    }
}
