import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { Document } from "@langchain/core/documents";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import path from "path";

let vectorStore: HNSWLib | null = null;

const MOCK_RESPONSE = `**Mock Mode Active**

I am simulating a response because the API key is set to "dempy" or is missing.

*   **RAG**: I pretended to search the knowledge base.
*   **Generation**: This text is streamed to simulate the Gemini API.

You can upload files and they will be "processed" (simulated), but I won't actually read them or update the vector store in this mode.

To use the real Gemini API, please set a valid \`GOOGLE_API_KEY\` in your \`.env.local\` file.`;

function isMockMode() {
    return !process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY === 'dempy';
}

function createMockStream(text: string) {
    const encoder = new TextEncoder();
    return new ReadableStream({
        async start(controller) {
            const chunks = text.split(/(?=[ \n])/); // Split by words/spaces/newlines
            for (const chunk of chunks) {
                controller.enqueue(encoder.encode(chunk));
                await new Promise(resolve => setTimeout(resolve, 20)); // Simulate typing speed
            }
            controller.close();
        }
    });
}

export async function getVectorStore() {
    if (isMockMode()) {
        throw new Error("Attempted to access vector store in mock mode");
    }
    if (vectorStore) return vectorStore;

    const text = await fs.readFile(path.join(process.cwd(), 'knowledge_base.txt'), 'utf-8');
    const docs = text.split('\n').filter(line => line.trim()).map(line => new Document({ pageContent: line }));

    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY,
        taskType: TaskType.RETRIEVAL_DOCUMENT,
    });

    vectorStore = await HNSWLib.fromDocuments(docs, embeddings);
    return vectorStore;
}

function iteratorToStream(iterator: AsyncIterable<any>) {
    const encoder = new TextEncoder();
    return new ReadableStream({
        async start(controller) {
            try {
                let hasReceivedData = false;
                for await (const chunk of iterator) {
                    let text = '';
                    
                    // Handle different chunk formats from @google/genai SDK
                    if (typeof chunk === 'string') {
                        text = chunk;
                    } else if (chunk?.text && typeof chunk.text === 'function') {
                        // SDK method to extract text (handles executableCode parts automatically)
                        try {
                            text = chunk.text();
                            hasReceivedData = true;
                        } catch (e) {
                            // If text() fails, try other methods
                            console.debug('chunk.text() failed, trying alternative extraction');
                        }
                    } else if (chunk?.text && typeof chunk.text === 'string') {
                        text = chunk.text;
                        hasReceivedData = true;
                    } else if (chunk?.candidates?.[0]?.content?.parts) {
                        // Handle response format with candidates - extract only text parts
                        const parts = chunk.candidates[0].content.parts;
                        text = parts
                            .filter((part: any) => part.text && !part.executableCode)
                            .map((part: any) => part.text)
                            .join('');
                        if (text) hasReceivedData = true;
                    } else if (chunk?.response?.text) {
                        text = typeof chunk.response.text === 'function' 
                            ? chunk.response.text() 
                            : chunk.response.text;
                        hasReceivedData = true;
                    } else if (chunk?.response?.candidates?.[0]?.content?.parts) {
                        const parts = chunk.response.candidates[0].content.parts;
                        text = parts
                            .filter((part: any) => part.text && !part.executableCode)
                            .map((part: any) => part.text)
                            .join('');
                        if (text) hasReceivedData = true;
                    } else {
                        // Try to extract text from any text property, skip executableCode
                        if (chunk?.executableCode) {
                            // Skip executable code parts - SDK warning is expected
                            continue;
                        }
                        text = chunk?.text || chunk?.content || '';
                        if (text && typeof text === 'string') {
                            hasReceivedData = true;
                        }
                    }
                    
                    if (text && text.trim()) {
                        // Check if controller is still open before enqueueing
                        try {
                            controller.enqueue(encoder.encode(text));
                        } catch (enqueueError: any) {
                            // If controller is closed, stop processing
                            if (enqueueError?.code === 'ERR_INVALID_STATE' || enqueueError?.message?.includes('closed')) {
                                console.warn('Stream controller was closed, stopping iteration');
                                return;
                            }
                            throw enqueueError;
                        }
                    }
                }
                
                if (!hasReceivedData) {
                    console.warn('No text data received from stream');
                }
            } catch (error) {
                console.error('Error in iteratorToStream:', error);
                // Only error if controller is still open
                try {
                    controller.error(error);
                } catch (errorError) {
                    // Controller might already be closed, ignore
                    console.warn('Could not send error to closed controller');
                }
                return;
            }
            // Only close if controller is still open
            try {
                controller.close();
            } catch (closeError) {
                // Controller might already be closed, ignore
                console.warn('Controller was already closed');
            }
        }
    });
}

export async function queryRAG(query: string) {
    if (isMockMode()) {
        return createMockStream(MOCK_RESPONSE);
    }

    try {
        // Check if files have been uploaded before querying
        const { hasUploadedFiles } = await import('./gemini-file-search');
        if (!hasUploadedFiles()) {
            const noFilesMessage = `**No Documents Uploaded**

I can't answer questions yet because no documents have been uploaded to the knowledge base.

**To get started:**
1. Upload a document using the file upload area above
2. Wait a few seconds for the document to be processed
3. Then ask your question

Once you upload a document, I'll be able to answer questions about its content!`;
            return createMockStream(noFilesMessage);
        }

        // Try to use Gemini File Search first
        const { queryWithFileSearchStream } = await import('./gemini-file-search');
        const response = await queryWithFileSearchStream(query);
        return iteratorToStream(response);
    } catch (fileSearchError: any) {
        console.log('File Search error:', fileSearchError?.message || fileSearchError);

        // If rate limited, return helpful message
        if (fileSearchError?.status === 429) {
            const errorMessage = `**Rate Limit Exceeded**

You've hit the API quota limit. This usually happens when:
- Making too many requests in a short time
- Using experimental models with lower quotas

**Solutions:**
1. Wait a minute and try again
2. Use a paid API key for higher limits
3. The system will automatically retry in a moment

Please try your question again in about a minute.`;
            return createMockStream(errorMessage);
        }

        // For model not found or other API errors
        if (fileSearchError?.status === 404 || fileSearchError?.code === 404) {
            const errorMessage = `**Model Configuration Issue**

The AI model is temporarily unavailable. This has been logged and will be fixed.

Please try again in a moment.`;
            return createMockStream(errorMessage);
        }

        // For invalid argument errors (400)
        if (fileSearchError?.status === 400 || fileSearchError?.code === 400) {
            const errorMessage = `**Configuration Error**

There was an issue with the request format. This has been logged.

Please try again in a moment.`;
            return createMockStream(errorMessage);
        }

        // Check if error indicates files aren't accessible
        const errorMessage = fileSearchError?.message || JSON.stringify(fileSearchError);
        if (errorMessage.includes('not accessible') || 
            errorMessage.includes('not found') || 
            errorMessage.includes('empty') ||
            errorMessage.includes('different store')) {
            const fileAccessErrorMessage = `**File Access Issue**

It seems the uploaded files are not accessible. This can happen if:
- The server was restarted (files are in a different store)
- Files are still being indexed (wait 30 seconds after upload)
- No files have been uploaded yet

**Solutions:**
1. Re-upload your file(s) to ensure they're in the current store
2. Wait 30 seconds after uploading before querying
3. Check the server logs for detailed error information

Please try uploading your file again and wait a moment before querying.`;
            return createMockStream(fileAccessErrorMessage);
        }

        // Generic error fallback
        const genericErrorMessage = `**Service Temporarily Unavailable**

I'm having trouble processing your request right now. 

**Error details:** ${errorMessage}

Please try again in a moment.`;
        return createMockStream(genericErrorMessage);
    }
}
export async function addDocument(text: string) {
    if (isMockMode()) {
        console.log("Mock mode: Document processing simulated.");
        return 1; // Simulate 1 chunk added
    }

    const vectorStore = await getVectorStore();
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    const docs = await splitter.createDocuments([text]);
    await vectorStore.addDocuments(docs);
    return docs.length;
}
