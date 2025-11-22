import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadFileToGemini } from '@/lib/gemini-file-search';

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
    // Check authentication with Clerk
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized. Please log in to upload files.' }, { status: 401 });
    }

    // Check rate limit
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
        const secondsRemaining = Math.ceil((rateLimitCheck.timeUntilNext || 0) / 1000);
        return NextResponse.json({ 
            error: `Upload rate limit exceeded. Please wait ${secondsRemaining} second${secondsRemaining !== 1 ? 's' : ''} before uploading again.` 
        }, { status: 429 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Check file size (10MB limit)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > MAX_FILE_SIZE) {
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            return NextResponse.json({ 
                error: `File size (${fileSizeMB} MB) exceeds the maximum allowed size of 10 MB. Please choose a smaller file.` 
            }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to Gemini File Search with user ID
        const result = await uploadFileToGemini(buffer, file.name, file.type, userId);

        // Record successful upload for rate limiting
        recordUpload(userId);

        return NextResponse.json({
            success: true,
            message: result.isDuplicate 
                ? `File "${file.name}" already exists in the knowledge base`
                : `Successfully uploaded ${file.name} to Gemini File Search`,
            fileName: result.fileName,
            storeName: result.storeName,
            isDuplicate: result.isDuplicate || false
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
