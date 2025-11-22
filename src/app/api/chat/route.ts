
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { queryRAG } from '@/lib/rag';

export async function POST(req: NextRequest) {
    // Check authentication with Clerk
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized. Please log in to use the chat.' }, { status: 401 });
    }

    try {
        const { message } = await req.json();
        const stream = await queryRAG(message, userId);

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });
    } catch (error) {
        console.error('Error in chat route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
