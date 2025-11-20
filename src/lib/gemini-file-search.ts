import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Global file search store (in-memory for demo)
let fileSearchStore: any = null;
let ai: GoogleGenAI | null = null;

// Track uploaded files to detect duplicates (in-memory)
// Format: Map<fileName_size, { fileName, size, uploadedAt, storeName, fileDocumentName }>
const uploadedFiles = new Map<string, { 
    fileName: string; 
    size: number; 
    uploadedAt: Date;
    storeName?: string;
    fileDocumentName?: string | null;
}>();

function isMockMode() {
    return !process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY === 'dempy';
}

async function getAI() {
    if (isMockMode()) {
        throw new Error("Cannot use Gemini File Search in mock mode");
    }
    if (!ai) {
        // Initialize with API key as per official documentation
        ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    }
    return ai;
}

async function getOrCreateFileSearchStore() {
    if (fileSearchStore) {
        console.log('Using existing file search store:', fileSearchStore.name);
        return fileSearchStore;
    }

    const client = await getAI();
    
    // Try to list existing stores first and reuse one if available
    try {
        console.log('Checking for existing file search stores...');
        // Note: The SDK might not have a list method, so we'll create a new one
        // But we'll use a consistent display name so they can be identified
        const storeDisplayName = 'RAG-Chatbot-Store';
        
        // For now, create a new store (in production, you'd want to persist the store name)
        console.log('Creating new file search store...');
        fileSearchStore = await client.fileSearchStores.create({
            config: {
                displayName: storeDisplayName
            }
        });

        console.log('Created file search store:', fileSearchStore.name);
        console.log('⚠️  NOTE: Store is created fresh. If server restarts, uploaded files may not be accessible.');
        console.log('⚠️  Store name to persist:', fileSearchStore.name);
        
        return fileSearchStore;
    } catch (error) {
        console.error('Error creating file search store:', error);
        throw error;
    }
}

export async function uploadFileToGemini(fileBuffer: Buffer, fileName: string, mimeType: string) {
    if (isMockMode()) {
        console.log('Mock mode: File upload simulated');
        return { success: true, fileName, isDuplicate: false };
    }

    // Check if file was already uploaded (by name and size)
    const fileKey = `${fileName}_${fileBuffer.length}`;

    try {
        const existingFile = uploadedFiles.get(fileKey);
        
        if (existingFile) {
            console.log('File already uploaded:', fileName);
            return {
                success: true,
                fileName,
                storeName: fileSearchStore?.name || null,
                isDuplicate: true,
                uploadedAt: existingFile.uploadedAt
            };
        }

        const client = await getAI();
        const store = await getOrCreateFileSearchStore();

        console.log('Uploading file to store:', store.name);
        console.log('File details:', { fileName, mimeType, size: fileBuffer.length });

        // Save buffer to temporary file
        const tempDir = os.tmpdir();
        const tempPath = path.join(tempDir, fileName);
        await fs.writeFile(tempPath, fileBuffer);
        console.log('Temporary file created:', tempPath);

        // Upload and import file into File Search store
        let operation = await client.fileSearchStores.uploadToFileSearchStore({
            file: tempPath,
            fileSearchStoreName: store.name,
            config: {
                displayName: fileName,
            }
        });

        console.log('Upload operation started:', operation.name);

        // Wait until import is complete (as per official docs: check every 5 seconds)
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max wait time
        while (!operation.done && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await client.operations.get({ operation });
            attempts++;
            
            if (operation.error) {
                console.error('Operation error:', operation.error);
                throw new Error(`Upload operation failed: ${JSON.stringify(operation.error)}`);
            }
            
            if (attempts % 6 === 0) {
                console.log(`Still processing... (${attempts * 5} seconds elapsed)`);
            }
        }

        if (!operation.done) {
            throw new Error('Upload operation timed out after 5 minutes');
        }

        // Check if operation completed successfully
        if (operation.error) {
            console.error('Operation completed with error:', operation.error);
            throw new Error(`Upload operation failed: ${JSON.stringify(operation.error)}`);
        }

        // Log operation response details
        console.log('Operation completed successfully');
        console.log('Operation name:', operation.name);
        console.log('Operation response:', JSON.stringify(operation.response, null, 2));
        
        // Check if response contains file information
        let fileDocumentName = null;
        if (operation.response) {
            const responseData = operation.response as any;
            fileDocumentName = responseData.fileSearchDocument?.name || 
                              responseData.document?.name ||
                              responseData.name;
            console.log('File document created:', fileDocumentName || 'Not found in response');
            console.log('Full response structure:', Object.keys(responseData));
            
            // Log the full response to understand structure
            if (!fileDocumentName) {
                console.log('Full operation response for debugging:', JSON.stringify(operation.response, null, 2));
            }
        }

        // Wait additional time for indexing to complete (File Search needs time to index)
        console.log('Waiting for file indexing to complete...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds for indexing

        // Clean up temp file
        await fs.unlink(tempPath).catch(() => { });

        console.log('File successfully uploaded and indexed to Gemini File Search:', fileName);
        console.log('Store name:', store.name);
        console.log('File document name:', fileDocumentName);
        console.log('IMPORTANT: Store will be lost on server restart. Store name:', store.name);
        
        // Track the uploaded file with store reference
        uploadedFiles.set(fileKey, {
            fileName,
            size: fileBuffer.length,
            uploadedAt: new Date(),
            storeName: store.name,
            fileDocumentName: fileDocumentName
        });
        
        return { 
            success: true, 
            fileName, 
            storeName: store.name,
            operationName: operation.name,
            isDuplicate: false
        };
        } catch (error: any) {
        console.error('Error uploading to Gemini:', error);
        
        // Check if error indicates file already exists
        const errorMessage = error?.message || JSON.stringify(error);
        if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
            // File might already exist in the store
            uploadedFiles.set(fileKey, {
                fileName,
                size: fileBuffer.length,
                uploadedAt: new Date()
            });
            
            return {
                success: true,
                fileName,
                storeName: fileSearchStore?.name || null,
                isDuplicate: true,
                message: 'File already exists in the store'
            };
        }
        
        throw error;
    }
}

export async function queryWithFileSearch(query: string) {
    if (isMockMode()) {
        throw new Error("Cannot query in mock mode");
    }

    const client = await getAI();
    const store = await getOrCreateFileSearchStore();

    // Use officially supported models for File Search (per documentation)
    // Supported models: gemini-2.5-pro, gemini-2.5-flash
    const models = [
        "gemini-2.5-flash",    // Recommended: Fast and efficient
        "gemini-2.5-pro",      // More capable, slower
    ];

    let lastError: any = null;
    for (const model of models) {
        try {
            // Generate content with File Search tool (per official documentation format)
            const response = await client.models.generateContent({
                model: model,
                contents: query,
                config: {
                    tools: [
                        {
                            fileSearch: {
                                fileSearchStoreNames: [store.name]
                            }
                        }
                    ]
                }
            });
            console.log(`Using model: ${model}`);
            return response;
        } catch (error: any) {
            lastError = error;
            if (error?.status === 404 || error?.code === 404) {
                // Model not found, try next one
                console.log(`Model ${model} not available, trying next...`);
                continue;
            }
            if (error?.status === 400 || error?.code === 400) {
                // Invalid argument - might be model doesn't support this format, try next
                console.log(`Model ${model} returned invalid argument error, trying next...`);
                continue;
            }
            if (error?.status === 429) {
                console.error('Rate limit exceeded. Please wait before making more requests.');
                throw error;
            }
            // Other errors, throw immediately
            throw error;
        }
    }
    
    throw lastError || new Error("No available models found");
}

export async function queryWithFileSearchStream(query: string) {
    if (isMockMode()) {
        throw new Error("Cannot query in mock mode");
    }

    const client = await getAI();
    const store = await getOrCreateFileSearchStore();

    console.log('Querying with File Search, store:', store.name);
    console.log('Query:', query);
    
    // Verify store exists and warn if it might be empty
    if (!store?.name) {
        console.warn('WARNING: File search store name is missing!');
        throw new Error('File search store is not properly initialized. Please upload a file first.');
    }

    // Check if we have any tracked files (indicates files were uploaded)
    const trackedFilesCount = uploadedFiles.size;
    console.log(`Tracked uploaded files count: ${trackedFilesCount}`);
    
    if (trackedFilesCount === 0) {
        console.warn('⚠️  WARNING: No files tracked in memory. Store might be empty or server was restarted.');
        console.warn('⚠️  Store name being used:', store.name);
        console.warn('⚠️  This means files uploaded before server restart are in a different store.');
        console.warn('⚠️  Solution: Please re-upload your files after server restart.');
    } else {
        const trackedFiles = Array.from(uploadedFiles.values());
        console.log('Uploaded files in memory:', trackedFiles.map(f => f.fileName).join(', '));
        
        // Check if tracked files are in the same store
        const filesInCurrentStore = trackedFiles.filter(f => f.storeName === store.name);
        if (filesInCurrentStore.length === 0 && trackedFiles.length > 0) {
            console.error('❌ ERROR: Tracked files are in a different store!');
            console.error('Current store:', store.name);
            console.error('Files were uploaded to:', trackedFiles[0].storeName);
            console.error('This happens when the server restarts and creates a new store.');
            throw new Error('Files were uploaded to a different store. Please re-upload your files after the server restart.');
        }
        
        console.log(`✓ Found ${filesInCurrentStore.length} file(s) in current store: ${store.name}`);
    }

    // Use officially supported models for File Search (per documentation)
    // Supported models: gemini-2.5-pro, gemini-2.5-flash
    const models = [
        "gemini-2.5-flash",    // Recommended: Fast and efficient
        "gemini-2.5-pro",      // More capable, slower
    ];

    let lastError: any = null;
    for (const model of models) {
        try {
            // Generate content stream with File Search tool (per official documentation format)
            // Ensure we're using the exact store name format
            const storeName = store.name;
            console.log(`Attempting query with model: ${model}`);
            console.log(`Using File Search Store: ${storeName}`);
            console.log(`File Search tool config:`, {
                fileSearch: {
                    fileSearchStoreNames: [storeName]
                }
            });
            
            const response = await client.models.generateContentStream({
                model: model,
                contents: query,
                config: {
                    tools: [
                        {
                            fileSearch: {
                                fileSearchStoreNames: [storeName]
                            }
                        }
                    ]
                }
            });
            
            console.log(`Successfully started streaming with model: ${model} and store: ${storeName}`);
            return response;
        } catch (error: any) {
            lastError = error;
            console.error(`Error with model ${model}:`, error?.message || error);
            if (error?.status === 404 || error?.code === 404) {
                // Model not found, try next one
                console.log(`Model ${model} not available, trying next...`);
                continue;
            }
            if (error?.status === 400 || error?.code === 400) {
                // Invalid argument - might be model doesn't support this format, try next
                console.log(`Model ${model} returned invalid argument error, trying next...`);
                continue;
            }
            if (error?.status === 429) {
                console.error('Rate limit exceeded. Please wait before making more requests.');
                throw error;
            }
            // Other errors, throw immediately
            throw error;
        }
    }
    
    throw lastError || new Error("No available models found");
}

export function getFileSearchStoreName() {
    return fileSearchStore?.name || null;
}

// Function to list files in the store (for debugging)
export async function listFilesInStore() {
    if (isMockMode()) {
        console.log('Mock mode: Cannot list files');
        return [];
    }

    try {
        const client = await getAI();
        const store = await getOrCreateFileSearchStore();
        
        // Try to get store details - this might not be directly available in the SDK
        // But we can at least verify the store exists
        console.log('Store name:', store.name);
        console.log('Store details:', JSON.stringify(store, null, 2));
        
        return store;
    } catch (error) {
        console.error('Error listing files in store:', error);
        throw error;
    }
}

// Function to verify store has files before querying
export async function verifyStoreHasFiles() {
    if (isMockMode()) {
        return false;
    }

    try {
        const store = await getOrCreateFileSearchStore();
        // The store object might contain file count or we need to check differently
        // For now, just verify store exists
        return !!store?.name;
    } catch (error) {
        console.error('Error verifying store:', error);
        return false;
    }
}
