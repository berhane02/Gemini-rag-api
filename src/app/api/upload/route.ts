import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadFileToGemini } from '@/lib/gemini-file-search';
import { validateFile, sanitizeFilename } from '@/lib/validation';
import { logger } from '@/lib/logger';

// Rate limiting: Store upload timestamps per user (in-memory, resets on server restart)
// In production, consider using Redis or a database for persistent rate limiting
const uploadTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const MAX_UPLOADS_PER_WINDOW = 5; // Max 5 uploads per minute per user

function checkRateLimit(userId: string): { allowed: boolean; timeUntilNext: number | null } {
    const now = Date.now();
    const timestamps = uploadTimestamps.get(userId) || [];

    // Filter out timestamps older than the rate limit window
    const recentTimestamps = timestamps.filter(
        timestamp => now - timestamp < RATE_LIMIT_WINDOW
    );

    if (recentTimestamps.length >= MAX_UPLOADS_PER_WINDOW) {
        const oldestTimestamp = Math.min(...recentTimestamps);
        const timeUntilNext = RATE_LIMIT_WINDOW - (now - oldestTimestamp);
        return { allowed: false, timeUntilNext };
    }

    return { allowed: true, timeUntilNext: null };
}

function recordUpload(userId: string) {
    const now = Date.now();
    const timestamps = uploadTimestamps.get(userId) || [];

    // Add current timestamp
    timestamps.push(now);

    // Keep only recent timestamps (within 2x the window for safety)
    const recentTimestamps = timestamps.filter(
        timestamp => now - timestamp < RATE_LIMIT_WINDOW * 2
    );

    uploadTimestamps.set(userId, recentTimestamps);
}

export async function POST(req: NextRequest) {
    try {
        // Check authentication with Clerk
        let userId: string | null = null;
        try {
            const authResult = await auth();
            userId = authResult?.userId || null;
        } catch (authError) {
            logger.error('Clerk auth error', authError);
            // If auth fails due to chunk loading, return unauthorized
            return NextResponse.json(
                { error: 'Authentication error. Please try logging in again.' },
                { status: 401 }
            );
        }

        if (!userId) {
            logger.warn('Unauthorized upload request attempt');
            return NextResponse.json(
                { error: 'Unauthorized. Please log in to upload files.' },
                { status: 401 }
            );
        }

        // Check rate limit
        const rateLimitCheck = checkRateLimit(userId);
        if (!rateLimitCheck.allowed) {
            const secondsRemaining = Math.ceil((rateLimitCheck.timeUntilNext || 0) / 1000);
            logger.warn('Rate limit exceeded', { userId, secondsRemaining });
            return NextResponse.json(
                {
                    error: `Upload rate limit exceeded. Please wait ${secondsRemaining} second${secondsRemaining !== 1 ? 's' : ''} before uploading again.`,
                },
                { status: 429 }
            );
        }

        // Parse form data
        let formData: FormData;
        try {
            formData = await req.formData();
        } catch (error) {
            logger.error('Failed to parse form data', error, { userId });
            return NextResponse.json(
                { error: 'Invalid request format' },
                { status: 400 }
            );
        }

        const file = formData.get('file') as File | null;

        if (!file) {
            logger.warn('No file in upload request', { userId });
            return NextResponse.json(
                { error: 'No file uploaded' },
                { status: 400 }
            );
        }

        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
            logger.warn('Invalid file in upload request', {
                userId,
                fileName: file.name,
                fileSize: file.size,
                error: validation.error,
            });
            return NextResponse.json(
                { error: validation.error || 'Invalid file' },
                { status: 400 }
            );
        }

        // Sanitize filename
        const sanitizedFilename = sanitizeFilename(file.name);

        // Convert file to buffer
        let buffer: Buffer;
        try {
            buffer = Buffer.from(await file.arrayBuffer());
        } catch (error) {
            logger.error('Failed to read file buffer', error, { userId, fileName: sanitizedFilename });
            return NextResponse.json(
                { error: 'Failed to process file' },
                { status: 500 }
            );
        }

        // Upload to Gemini File Search with user ID
        logger.info('Uploading file to Gemini', {
            userId,
            fileName: sanitizedFilename,
            fileSize: buffer.length,
            mimeType: file.type,
        });

        const result = await uploadFileToGemini(buffer, sanitizedFilename, file.type, userId);

        // Record successful upload for rate limiting
        recordUpload(userId);

        logger.info('File uploaded successfully', {
            userId,
            fileName: sanitizedFilename,
            isDuplicate: result.isDuplicate,
        });

        // Return processing status - files start as 'processing' after upload
        // The background verification will update to 'ready' when complete
        const processingStatus = result.isDuplicate ? 'ready' as const : 'processing' as const;

        return NextResponse.json({
            success: true,
            message: result.isDuplicate
                ? `File "${sanitizedFilename}" already exists in the knowledge base`
                : `Successfully uploaded ${sanitizedFilename} to Gemini File Search`,
            fileName: result.fileName,
            storeName: result.storeName,
            isDuplicate: result.isDuplicate || false,
            processingStatus,
        });
    } catch (error) {
        logger.error('Upload error', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error. Please try again later.',
            },
            { status: 500 }
        );
    }
}
