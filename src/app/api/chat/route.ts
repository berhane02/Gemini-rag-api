
import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { queryRAG } from '@/lib/rag';

export async function POST(req: NextRequest) {
    // Check authentication
    const session = await auth0.getSession(req);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized. Please log in to use the chat.' }, { status: 401 });
    }

    try {
        const { message } = await req.json();
        const stream = await queryRAG(message);

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
