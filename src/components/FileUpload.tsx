'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function FileUpload() {
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [isDuplicate, setIsDuplicate] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            setUploadSuccess(false);
            setIsDuplicate(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles: 1,
        accept: {
            'text/plain': ['.txt', '.md'],
            'application/pdf': ['.pdf'],
        },
    });

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setUploadSuccess(false);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.details || 'Upload failed');
            }

            const result = await response.json();
            setUploadSuccess(true);
            setIsDuplicate(result.isDuplicate || false);
            // Keep file info visible, don't auto-remove
        } catch (error) {
            console.error('Upload error:', error);
            alert(error instanceof Error ? error.message : 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const removeFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFile(null);
        setUploadSuccess(false);
        setIsDuplicate(false);
    };

    return (
        <div className="w-full max-w-md mx-auto mb-4">
            <AnimatePresence mode="wait">
                {!file ? (
                    <motion.div
                        key="dropzone"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div
                            {...getRootProps()}
                            className={clsx(
                                'relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300 overflow-hidden group',
                                isDragActive
                                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 scale-105 shadow-lg shadow-blue-500/20'
                                    : 'border-blue-300 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-600 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/10 dark:to-gray-900 hover:shadow-lg hover:shadow-blue-500/10'
                            )}
                        >
                            {/* Animated background gradient */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            
                            <input {...getInputProps()} />
                            <motion.div
                                animate={isDragActive ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                                transition={{ duration: 0.2 }}
                                className="relative z-10"
                            >
                                <div className="relative inline-block mb-2">
                                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl" />
                                    <Upload className="relative mx-auto h-8 w-8 text-blue-500 dark:text-blue-400" />
                                </div>
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {isDragActive ? (
                                        <span className="text-blue-600 dark:text-blue-400 font-semibold">Drop here...</span>
                                    ) : (
                                        'Drag & drop or click to select'
                                    )}
                                </p>
                                <p className="text-xs text-blue-500 dark:text-blue-400 font-medium">
                                    TXT, MD, PDF (max 10MB)
                                </p>
                            </motion.div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="file-preview"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="relative"
                    >
                        {uploadSuccess ? (
                            // Success state: Show file info on the right
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`flex items-center justify-between bg-white dark:bg-gray-900 border rounded-xl p-3 shadow-md ${
                                    isDuplicate 
                                        ? 'border-yellow-500/50 dark:border-yellow-500/30 bg-yellow-50/30 dark:bg-yellow-950/10'
                                        : 'border-green-500/50 dark:border-green-500/30 bg-green-50/30 dark:bg-green-950/10'
                                }`}
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.1, type: "spring" }}
                                        className={`p-1.5 rounded-lg shadow-sm ${
                                            isDuplicate
                                                ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                                                : 'bg-gradient-to-br from-green-500 to-emerald-500'
                                        }`}
                                    >
                                        <CheckCircle2 className="h-4 w-4 text-white" />
                                    </motion.div>
                                    <span className={`text-xs font-medium ${
                                        isDuplicate
                                            ? 'text-yellow-600 dark:text-yellow-400'
                                            : 'text-green-600 dark:text-green-400'
                                    }`}>
                                        {isDuplicate ? 'Already Exists' : 'Uploaded'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 ml-4">
                                    <div className="text-right">
                                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={removeFile}
                                        className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                    >
                                        <X size={16} />
                                    </motion.button>
                                </div>
                            </motion.div>
                        ) : (
                            // Upload state: Show upload button
                            <div className={clsx(
                                "bg-white dark:bg-gray-900 border rounded-xl p-3 shadow-lg transition-all duration-300",
                                "border-blue-200 dark:border-blue-800"
                            )}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.1, type: "spring" }}
                                            className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md shadow-blue-500/30"
                                        >
                                            <File className="h-4 w-4 text-white" />
                                        </motion.div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                                {file.name}
                                            </p>
                                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={removeFile}
                                        className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                        disabled={uploading}
                                    >
                                        <X size={16} />
                                    </motion.button>
                                </div>
                                
                                <motion.button
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    className="w-full relative overflow-hidden group flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white py-2 px-3 rounded-lg hover:from-blue-500 hover:via-blue-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-xs font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                    {uploading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin relative z-10" />
                                            <span className="relative z-10">Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 relative z-10" />
                                            <span className="relative z-10">Upload to Knowledge Base</span>
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
