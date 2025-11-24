import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { logger } from './logger';
import { getGoogleApiKey } from './env';

// User-specific file search stores (in-memory for demo)
// Format: Map<userId, store>
const userFileStores = new Map<string, any>();
let ai: GoogleGenAI | null = null;

// Processing status type
export type FileProcessingStatus = 'uploading' | 'processing' | 'ready' | 'error';

// Track uploaded files per user to detect duplicates (in-memory)
// Format: Map<userId_fileName_size, { userId, fileName, size, uploadedAt, storeName, fileDocumentName, processingStatus }>
const uploadedFiles = new Map<string, {
    userId: string;
    fileName: string;
    size: number;
    uploadedAt: Date;
    storeName?: string;
    fileDocumentName?: string | null;
    processingStatus: FileProcessingStatus;
    errorMessage?: string;
}>();

// Lock mechanism to prevent race conditions when creating stores
// Format: Map<userId, Promise<store>>
const storeCreationPromises = new Map<string, Promise<any>>();

async function getAI() {
    if (!ai) {
        // Initialize with API key as per official documentation
        ai = new GoogleGenAI({ apiKey: getGoogleApiKey() });
        logger.info('GoogleGenAI client initialized');
    }
    return ai;
}

export async function getOrCreateFileSearchStore(userId: string) {
    // Check if user already has a store in memory
    if (userFileStores.has(userId)) {
        const store = userFileStores.get(userId);
        logger.debug('Using existing file search store', { userId, storeName: store.name });
        return store;
    }

    // Check if store creation is already in progress for this user (prevent race condition)
    if (storeCreationPromises.has(userId)) {
        logger.debug('Store creation already in progress, waiting', { userId });
        return await storeCreationPromises.get(userId);
    }

    // Create a promise for store creation and store it to prevent concurrent creation
    const creationPromise = (async () => {
        const client = await getAI();

        try {
            // Double-check after acquiring lock (another request might have created it)
            if (userFileStores.has(userId)) {
                const store = userFileStores.get(userId);
                logger.debug('Store was created by another request', { userId, storeName: store.name });
                return store;
            }

            logger.info('Creating new file search store', { userId });
            // Create user-specific store with user ID in display name
            const storeDisplayName = `RAG-Chatbot-Store-${userId}`;

            const newStore = await client.fileSearchStores.create({
                config: {
                    displayName: storeDisplayName
                }
            });

            logger.info('Created file search store', {
                userId,
                storeName: newStore.name,
                displayName: storeDisplayName,
            });

            // Store it in the user-specific map
            userFileStores.set(userId, newStore);

            return newStore;
        } catch (error) {
            logger.error('Error creating file search store', error, { userId });
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
    if (!userId) {
        throw new Error('User ID is required for file upload');
    }

    // Check if file was already uploaded by this user (by userId, name and size)
    const fileKey = `${userId}_${fileName}_${fileBuffer.length}`;

    try {
        const existingFile = uploadedFiles.get(fileKey);

        if (existingFile && existingFile.userId === userId) {
            logger.info('File already uploaded', { userId, fileName });
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
            logger.info('File was uploaded by another concurrent request', { userId, fileName });
            const userStore = userFileStores.get(userId);
            return {
                success: true,
                fileName,
                storeName: userStore?.name || null,
                isDuplicate: true,
                uploadedAt: existingFileAfterStore.uploadedAt
            };
        }

        logger.info('Uploading file to store', { userId, storeName: store.name, fileName, mimeType, size: fileBuffer.length });

        // Save buffer to temporary file with unique name to prevent collisions
        // Include userId and timestamp to ensure uniqueness across concurrent uploads
        const tempDir = os.tmpdir();
        const uniqueFileName = `${userId}_${Date.now()}_${fileName}`;
        const tempPath = path.join(tempDir, uniqueFileName);
        await fs.writeFile(tempPath, fileBuffer);
        logger.debug('Temporary file created', { tempPath });

        // Upload and import file into File Search store
        let operation = await client.fileSearchStores.uploadToFileSearchStore({
            file: tempPath,
            fileSearchStoreName: store.name,
            config: {
                displayName: fileName,
            }
        });

        logger.info('Upload operation started', { operationName: operation.name });

        // Wait until import is complete (as per official docs: check every 5 seconds)
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max wait time
        while (!operation.done && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await client.operations.get({ operation });
            attempts++;

            if (operation.error) {
                logger.error('Operation error', operation.error, { userId, fileName });
                throw new Error(`Upload operation failed: ${JSON.stringify(operation.error)}`);
            }

            if (attempts % 6 === 0) {
                logger.debug('Still processing upload', { attempts, elapsedSeconds: attempts * 5 });
            }
        }

        if (!operation.done) {
            logger.error('Upload operation timed out', undefined, { userId, fileName, maxAttempts });
            throw new Error('Upload operation timed out after 5 minutes');
        }

        // Check if operation completed successfully
        if (operation.error) {
            logger.error('Operation completed with error', operation.error, { userId, fileName });
            throw new Error(`Upload operation failed: ${JSON.stringify(operation.error)}`);
        }

        // Log operation response details
        logger.info('Operation completed successfully', { operationName: operation.name });

        // Check if response contains file information
        let fileDocumentName = null;
        if (operation.response) {
            const responseData = operation.response as any;
            fileDocumentName = responseData.fileSearchDocument?.name ||
                responseData.document?.name ||
                responseData.name;
            logger.debug('File document created', { fileDocumentName, responseKeys: Object.keys(responseData) });
        }

        // Wait additional time for indexing to complete (File Search needs time to index)
        logger.debug('Waiting for file indexing to complete');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds for indexing

        // Clean up temp file
        await fs.unlink(tempPath).catch(() => { });

        logger.info('File successfully uploaded and indexed', {
            userId,
            fileName,
            storeName: store.name,
            fileDocumentName,
            fileKey,
            fileSize: fileBuffer.length,
        });

        // Track the uploaded file with store reference and user ID
        uploadedFiles.set(fileKey, {
            userId,
            fileName,
            size: fileBuffer.length,
            uploadedAt: new Date(),
            storeName: store.name,
            fileDocumentName: fileDocumentName,
            processingStatus: 'ready' // File is ready after indexing wait
        });

        const userFileCount = Array.from(uploadedFiles.values()).filter(f => f.userId === userId).length;
        logger.debug('File tracked successfully', {
            userId,
            totalFiles: userFileCount,
            trackedFiles: Array.from(uploadedFiles.values())
                .filter(f => f.userId === userId)
                .map(f => `${f.fileName} (store: ${f.storeName})`),
        });

        return {
            success: true,
            fileName,
            storeName: store.name,
            operationName: operation.name,
            isDuplicate: false
        };
    } catch (error: any) {
        logger.error('Error uploading to Gemini', error, { userId, fileName });

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
                storeName: userStore?.name || null,
                processingStatus: 'ready' // Assume ready if duplicate
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
            logger.info('Using model for query', { model, userId });
            return response;
        } catch (error: any) {
            lastError = error;
            if (error?.status === 404 || error?.code === 404) {
                // Model not found, try next one
                logger.debug('Model not available, trying next', { model, userId });
                continue;
            }
            if (error?.status === 400 || error?.code === 400) {
                // Invalid argument - might be model doesn't support this format, try next
                logger.debug('Model returned invalid argument error, trying next', { model, userId });
                continue;
            }
            if (error?.status === 429) {
                logger.warn('Rate limit exceeded', { userId });
                throw error;
            }
            // Other errors, throw immediately
            throw error;
        }
    }

    throw lastError || new Error("No available models found");
}

export async function queryWithFileSearchStream(query: string, userId: string) {
    if (!userId) {
        throw new Error('User ID is required for querying');
    }

    const client = await getAI();
    const store = await getOrCreateFileSearchStore(userId);

    logger.info('Querying with File Search', { userId, storeName: store.name, queryLength: query.length });

    // Verify store exists and warn if it might be empty
    if (!store?.name) {
        logger.error('File search store name is missing', undefined, { userId });
        throw new Error('File search store is not properly initialized. Please upload a file first.');
    }

    // Check if we have any tracked files for this user (for logging only)
    // Note: We don't throw errors here because the in-memory Map gets cleared on server restart
    // Even if files exist in Gemini, we should try to query and let Gemini handle empty stores
    const userTrackedFiles = Array.from(uploadedFiles.values()).filter(f => f.userId === userId);
    const trackedFilesCount = userTrackedFiles.length;

    if (trackedFilesCount === 0) {
        logger.warn('No files tracked in memory (normal after server restart)', { userId, storeName: store.name });
    } else {
        const filesInCurrentStore = userTrackedFiles.filter(f => f.storeName === store.name);
        logger.debug('Tracked files found', {
            userId,
            totalTracked: trackedFilesCount,
            inCurrentStore: filesInCurrentStore.length,
            files: userTrackedFiles.map(f => f.fileName),
        });
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
            logger.debug('Attempting query with model', { model, storeName, userId });

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

            logger.info('Successfully started streaming', { model, storeName, userId });
            return response;
        } catch (error: any) {
            lastError = error;
            logger.error('Error with model', error, { model, userId });
            if (error?.status === 404 || error?.code === 404) {
                // Model not found, try next one
                logger.debug('Model not available, trying next', { model, userId });
                continue;
            }
            if (error?.status === 400 || error?.code === 400) {
                // Invalid argument - might be model doesn't support this format, try next
                logger.debug('Model returned invalid argument error, trying next', { model, userId });
                continue;
            }
            if (error?.status === 429) {
                logger.warn('Rate limit exceeded', { userId });
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
    if (!userId) {
        throw new Error('User ID is required to list files');
    }

    try {
        const client = await getAI();
        const store = await getOrCreateFileSearchStore(userId);

        // Also return user's uploaded files
        const userFiles = Array.from(uploadedFiles.values()).filter(f => f.userId === userId);
        logger.debug('Listed files in store', { userId, storeName: store.name, fileCount: userFiles.length });

        return { store, userFiles };
    } catch (error) {
        logger.error('Error listing files in store', error, { userId });
        throw error;
    }
}

// Function to verify store has files before querying
export async function verifyStoreHasFiles(userId: string) {
    try {
        const store = await getOrCreateFileSearchStore(userId);
        // The store object might contain file count or we need to check differently
        // For now, just verify store exists
        return !!store?.name;
    } catch (error) {
        logger.error('Error verifying store', error, { userId });
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

// Function to get processing status for all files of a user
export function getFileProcessingStatus(userId: string) {
    if (!userId) {
        return {
            files: [],
            allReady: false,
            processingCount: 0,
            readyCount: 0,
            errorCount: 0
        };
    }

    const userFiles = Array.from(uploadedFiles.values())
        .filter(f => f.userId === userId)
        .map(f => ({
            fileName: f.fileName,
            status: f.processingStatus,
            uploadedAt: f.uploadedAt,
            errorMessage: f.errorMessage,
            size: f.size
        }));

    const processingCount = userFiles.filter(f => f.status === 'processing' || f.status === 'uploading').length;
    const readyCount = userFiles.filter(f => f.status === 'ready').length;
    const errorCount = userFiles.filter(f => f.status === 'error').length;
    const allReady = userFiles.length > 0 && processingCount === 0 && errorCount === 0;

    return {
        files: userFiles,
        allReady,
        processingCount,
        readyCount,
        errorCount,
        totalFiles: userFiles.length
    };
}

// Function to update processing status for a specific file
export function updateFileProcessingStatus(
    userId: string,
    fileName: string,
    fileSize: number,
    status: FileProcessingStatus,
    errorMessage?: string
) {
    const fileKey = `${userId}_${fileName}_${fileSize}`;
    const existingFile = uploadedFiles.get(fileKey);

    if (existingFile && existingFile.userId === userId) {
        uploadedFiles.set(fileKey, {
            ...existingFile,
            processingStatus: status,
            errorMessage: errorMessage
        });
        logger.debug('Updated file processing status', { userId, fileName, status, errorMessage });
        return true;
    }

    return false;
}
