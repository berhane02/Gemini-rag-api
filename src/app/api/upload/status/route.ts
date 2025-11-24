import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getFileProcessingStatus } from '@/lib/gemini-file-search';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    try {
        // Check authentication with Clerk
        let userId: string | null = null;
        try {
            const authResult = await auth();
            userId = authResult?.userId || null;
        } catch (authError) {
            logger.error('Clerk auth error', authError);
            return NextResponse.json(
                { error: 'Authentication error. Please try logging in again.' },
                { status: 401 }
            );
        }

        if (!userId) {
            logger.warn('Unauthorized status request attempt');
            return NextResponse.json(
                { error: 'Unauthorized. Please log in to check file status.' },
                { status: 401 }
            );
        }

        // Get processing status for all user's files
        const statusInfo = getFileProcessingStatus(userId);

        logger.debug('File processing status retrieved', {
            userId,
            totalFiles: statusInfo.totalFiles,
            processingCount: statusInfo.processingCount,
            readyCount: statusInfo.readyCount,
            errorCount: statusInfo.errorCount,
            allReady: statusInfo.allReady
        });

        return NextResponse.json({
            files: statusInfo.files,
            allReady: statusInfo.allReady,
            processingCount: statusInfo.processingCount,
            readyCount: statusInfo.readyCount,
            errorCount: statusInfo.errorCount,
            totalFiles: statusInfo.totalFiles
        });
    } catch (error) {
        logger.error('Status check error', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error. Please try again later.',
            },
            { status: 500 }
        );
    }
}
