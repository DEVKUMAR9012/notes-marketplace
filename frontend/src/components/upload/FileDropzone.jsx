import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiFile, FiUploadCloud, FiX } from 'react-icons/fi';
import { validateFile } from './ValidationHelpers';

export default function FileDropzone({ file, setFile, setError }) {
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError('');
    
    if (rejectedFiles && rejectedFiles.length > 0) {
      setError('File type or size not supported. Please check the requirements.');
      return;
    }

    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    // Heavy client-side validation
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }

    setFile(selectedFile);
  }, [setError, setFile]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024, // 10MB via react-dropzone
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'text/plain': ['.txt']
    }
  });

  const removeFile = (e) => {
    e.stopPropagation();
    setFile(null);
  };

  return (
    <div 
      {...getRootProps()} 
      className={`mt-2 border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer group ${
        isDragReject ? 'border-red-400/60 bg-red-50' :
        isDragActive ? 'border-coral-400 bg-coral-50 scale-[1.02]' :
        file ? 'border-emerald-400/60 bg-emerald-50' : 
        'border-black/10 bg-white/40 hover:border-coral-400/40 hover:bg-white/60'
      }`}
    >
      <input {...getInputProps()} />
      
      {file ? (
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <FiFile className="text-3xl text-emerald-600" />
          </div>
          <p className="text-emerald-700 font-semibold text-lg max-w-[90%] truncate">
            {file.name}
          </p>
          <p className="text-sm text-emerald-600/80 mt-1">
            {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to upload
          </p>
          <button 
            type="button"
            onClick={removeFile}
            className="mt-4 flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-red-500 transition-colors bg-black/5 px-4 py-2 rounded-xl"
          >
            <FiX size={14} /> Remove File
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${isDragActive ? 'bg-coral-100' : 'bg-black/5 group-hover:bg-coral-50'}`}>
            <FiUploadCloud className={`text-4xl transition-colors duration-300 ${isDragActive ? 'text-coral-500 scale-110' : 'text-gray-400 group-hover:text-coral-500'}`} />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {isDragActive ? 'Drop it here!' : 'Drag & drop your file here'}
          </h3>
          
          <p className="text-sm text-gray-500 mb-6">
            or <span className="text-coral-500 group-hover:text-coral-600 transition-colors">browse from your computer</span>
          </p>
          
          <div className="flex flex-wrap justify-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            <span className="bg-black/5 px-2 py-1 rounded-md">PDF</span>
            <span className="bg-black/5 px-2 py-1 rounded-md">DOCX</span>
            <span className="bg-black/5 px-2 py-1 rounded-md">PPT</span>
            <span className="bg-black/5 px-2 py-1 rounded-md">Images</span>
            <span className="bg-black/5 px-2 py-1 rounded-md text-coral-500/80">MAX 10MB</span>
          </div>
        </div>
      )}
    </div>
  );
}
