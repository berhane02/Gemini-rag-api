import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { uploadFileToGemini } from '@/lib/gemini-file-search';

export async function POST(req: NextRequest) {
    // Check authentication
    const session = await auth0.getSession(req);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized. Please log in to upload files.' }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to Gemini File Search
        const result = await uploadFileToGemini(buffer, file.name, file.type);

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
