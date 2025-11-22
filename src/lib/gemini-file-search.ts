import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// User-specific file search stores (in-memory for demo)
// Format: Map<userId, store>
const userFileStores = new Map<string, any>();
let ai: GoogleGenAI | null = null;

// Track uploaded files per user to detect duplicates (in-memory)
// Format: Map<userId_fileName_size, { userId, fileName, size, uploadedAt, storeName, fileDocumentName }>
const uploadedFiles = new Map<string, { 
    userId: string;
    fileName: string; 
    size: number; 
    uploadedAt: Date;
    storeName?: string;
    fileDocumentName?: string | null;
}>();

// Lock mechanism to prevent race conditions when creating stores
// Format: Map<userId, Promise<store>>
const storeCreationPromises = new Map<string, Promise<any>>();

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

export async function getOrCreateFileSearchStore(userId: string) {
    // Check if user already has a store in memory
    if (userFileStores.has(userId)) {
        const store = userFileStores.get(userId);
        console.log(`[FileSearch] Using existing file search store for user ${userId}:`, store.name);
        return store;
    }

    // Check if store creation is already in progress for this user (prevent race condition)
    if (storeCreationPromises.has(userId)) {
        console.log(`[FileSearch] Store creation already in progress for user ${userId}, waiting...`);
        return await storeCreationPromises.get(userId);
    }

    // Create a promise for store creation and store it to prevent concurrent creation
    const creationPromise = (async () => {
        const client = await getAI();
        
        try {
            // Double-check after acquiring lock (another request might have created it)
            if (userFileStores.has(userId)) {
                const store = userFileStores.get(userId);
                console.log(`[FileSearch] Store was created by another request for user ${userId}:`, store.name);
                return store;
            }
            
            console.log(`[FileSearch] Creating new file search store for user: ${userId}`);
            // Create user-specific store with user ID in display name
            const storeDisplayName = `RAG-Chatbot-Store-${userId}`;
            
            const newStore = await client.fileSearchStores.create({
                config: {
                    displayName: storeDisplayName
                }
            });

            console.log(`[FileSearch] Created file search store for user ${userId}:`, newStore.name);
            console.log(`[FileSearch] ⚠️  NOTE: Store is created fresh. If server restarts, a new store will be created.`);
            console.log(`[FileSearch] ⚠️  Store name: ${newStore.name}`);
            console.log(`[FileSearch] ⚠️  IMPORTANT: Files uploaded before server restart are in a different store and won't be accessible.`);
            console.log(`[FileSearch] ⚠️  Users need to re-upload files after server restart.`);
            
            // Store it in the user-specific map
            userFileStores.set(userId, newStore);
            
            return newStore;
        } catch (error) {
            console.error(`[FileSearch] Error creating file search store for user ${userId}:`, error);
            throw error;
        } finally {
            // Remove the promise from the map once creation is complete (success or failure)
            storeCreationPromises.delete(userId);
        }
    })();

    // Store the promise to prevent concurrent creation
    storeCreationPromises.set(userId, creationPromise);
    
    return await creationPromise;
}

export async function uploadFileToGemini(fileBuffer: Buffer, fileName: string, mimeType: string, userId: string) {
    if (isMockMode()) {
        console.log('Mock mode: File upload simulated');
        return { success: true, fileName, isDuplicate: false };
    }

    if (!userId) {
        throw new Error('User ID is required for file upload');
    }

    // Check if file was already uploaded by this user (by userId, name and size)
    const fileKey = `${userId}_${fileName}_${fileBuffer.length}`;

    try {
        const existingFile = uploadedFiles.get(fileKey);
        
        if (existingFile && existingFile.userId === userId) {
            console.log(`File already uploaded by user ${userId}:`, fileName);
            const userStore = userFileStores.get(userId);
            return {
                success: true,
                fileName,
                storeName: userStore?.name || null,
                isDuplicate: true,
                uploadedAt: existingFile.uploadedAt
            };
        }

        const client = await getAI();
        const store = await getOrCreateFileSearchStore(userId);
        
        // Double-check for duplicate after getting store (race condition protection)
        // Another concurrent request might have uploaded the same file
        const existingFileAfterStore = uploadedFiles.get(fileKey);
        if (existingFileAfterStore && existingFileAfterStore.userId === userId && existingFileAfterStore !== existingFile) {
            console.log(`[FileSearch] File was uploaded by another concurrent request for user ${userId}:`, fileName);
            const userStore = userFileStores.get(userId);
            return {
                success: true,
                fileName,
                storeName: userStore?.name || null,
                isDuplicate: true,
                uploadedAt: existingFileAfterStore.uploadedAt
            };
        }

        console.log('[FileSearch] Uploading file to store:', store.name);
        console.log('File details:', { fileName, mimeType, size: fileBuffer.length });

        // Save buffer to temporary file with unique name to prevent collisions
        // Include userId and timestamp to ensure uniqueness across concurrent uploads
        const tempDir = os.tmpdir();
        const uniqueFileName = `${userId}_${Date.now()}_${fileName}`;
        const tempPath = path.join(tempDir, uniqueFileName);
        await fs.writeFile(tempPath, fileBuffer);
        console.log('[FileSearch] Temporary file created:', tempPath);

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

        console.log(`[FileSearch] ✅ File successfully uploaded and indexed to Gemini File Search for user ${userId}:`, fileName);
        console.log(`[FileSearch] Store name:`, store.name);
        console.log(`[FileSearch] File document name:`, fileDocumentName);
        console.log(`[FileSearch] File key:`, fileKey);
        console.log(`[FileSearch] File size:`, fileBuffer.length, 'bytes');
        
        // Track the uploaded file with store reference and user ID
        uploadedFiles.set(fileKey, {
            userId,
            fileName,
            size: fileBuffer.length,
            uploadedAt: new Date(),
            storeName: store.name,
            fileDocumentName: fileDocumentName
        });
        
        const userFileCount = Array.from(uploadedFiles.values()).filter(f => f.userId === userId).length;
        console.log(`[FileSearch] ✓ File tracked successfully. Total files for user ${userId}: ${userFileCount}`);
        console.log(`[FileSearch] All tracked files for user:`, Array.from(uploadedFiles.values())
            .filter(f => f.userId === userId)
            .map(f => `${f.fileName} (store: ${f.storeName})`)
            .join(', ') || 'none');
        console.log(`[FileSearch] ⚠️  IMPORTANT: Store name ${store.name} persists on Google's servers but will be lost from memory on server restart.`);
        
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
            const userStore = userFileStores.get(userId);
            uploadedFiles.set(fileKey, {
                userId,
                fileName,
                size: fileBuffer.length,
                uploadedAt: new Date(),
                storeName: userStore?.name || null
            });
            
            return {
                success: true,
                fileName,
                storeName: userStore?.name || null,
                isDuplicate: true,
                message: 'File already exists in the store'
            };
        }
        
        throw error;
    }
}

export async function queryWithFileSearch(query: string, userId: string) {
    if (isMockMode()) {
        throw new Error("Cannot query in mock mode");
    }

    if (!userId) {
        throw new Error('User ID is required for querying');
    }

    const client = await getAI();
    const store = await getOrCreateFileSearchStore(userId);

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

export async function queryWithFileSearchStream(query: string, userId: string) {
    if (isMockMode()) {
        throw new Error("Cannot query in mock mode");
    }

    if (!userId) {
        throw new Error('User ID is required for querying');
    }

    const client = await getAI();
    const store = await getOrCreateFileSearchStore(userId);

    console.log('Querying with File Search, store:', store.name);
    console.log('Query:', query);
    
    // Verify store exists and warn if it might be empty
    if (!store?.name) {
        console.warn('WARNING: File search store name is missing!');
        throw new Error('File search store is not properly initialized. Please upload a file first.');
    }

    // Check if we have any tracked files for this user (for logging only)
    // Note: We don't throw errors here because the in-memory Map gets cleared on server restart
    // Even if files exist in Gemini, we should try to query and let Gemini handle empty stores
    const userTrackedFiles = Array.from(uploadedFiles.values()).filter(f => f.userId === userId);
    const trackedFilesCount = userTrackedFiles.length;
    console.log(`Tracked uploaded files count for user ${userId}: ${trackedFilesCount}`);
    
    if (trackedFilesCount === 0) {
        console.warn(`⚠️  INFO: No files tracked in memory for user ${userId}. This is normal after server restart.`);
        console.warn('⚠️  Store name being used:', store.name);
        console.warn('⚠️  Will attempt query anyway - Gemini will handle if store is empty.');
    } else {
        console.log(`Uploaded files in memory for user ${userId}:`, userTrackedFiles.map(f => f.fileName).join(', '));
        const filesInCurrentStore = userTrackedFiles.filter(f => f.storeName === store.name);
        console.log(`✓ Found ${filesInCurrentStore.length} tracked file(s) in current store for user ${userId}: ${store.name}`);
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

export function getFileSearchStoreName(userId: string) {
    const store = userFileStores.get(userId);
    return store?.name || null;
}

// Function to list files in the store (for debugging)
export async function listFilesInStore(userId: string) {
    if (isMockMode()) {
        console.log('Mock mode: Cannot list files');
        return [];
    }

    if (!userId) {
        throw new Error('User ID is required to list files');
    }

    try {
        const client = await getAI();
        const store = await getOrCreateFileSearchStore(userId);
        
        // Try to get store details - this might not be directly available in the SDK
        // But we can at least verify the store exists
        console.log(`Store name for user ${userId}:`, store.name);
        console.log('Store details:', JSON.stringify(store, null, 2));
        
        // Also return user's uploaded files
        const userFiles = Array.from(uploadedFiles.values()).filter(f => f.userId === userId);
        console.log(`User ${userId} uploaded files:`, userFiles.map(f => f.fileName));
        
        return { store, userFiles };
    } catch (error) {
        console.error(`Error listing files in store for user ${userId}:`, error);
        throw error;
    }
}

// Function to verify store has files before querying
export async function verifyStoreHasFiles(userId: string) {
    if (isMockMode()) {
        return false;
    }

    try {
        const store = await getOrCreateFileSearchStore(userId);
        // The store object might contain file count or we need to check differently
        // For now, just verify store exists
        return !!store?.name;
    } catch (error) {
        console.error(`Error verifying store for user ${userId}:`, error);
        return false;
    }
}

// Function to check if any files have been uploaded by a specific user
export function hasUploadedFiles(userId?: string): boolean {
    if (!userId) {
        return uploadedFiles.size > 0;
    }
    return Array.from(uploadedFiles.values()).some(f => f.userId === userId);
}

// Function to get count of uploaded files for a specific user
export function getUploadedFilesCount(userId?: string): number {
    if (!userId) {
        return uploadedFiles.size;
    }
    return Array.from(uploadedFiles.values()).filter(f => f.userId === userId).length;
}
