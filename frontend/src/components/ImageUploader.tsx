import React, { useCallback, useRef } from 'react';
import { Upload } from 'lucide-react';

interface ImageUploaderProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onFilesSelected, 
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFilesSelected(Array.from(files));
      event.target.value = '';
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFilesSelected(Array.from(files));
    }
  }, [disabled, onFilesSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      className={`w-full aspect-video md:aspect-square rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed border-gray-700 bg-gray-800/30' : 'border-gray-600 hover:border-indigo-500 hover:bg-gray-800/50 bg-gray-800/30'}
      `}
      onClick={!disabled ? triggerUpload : undefined}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange} 
        accept="image/*" 
        multiple
        className="hidden" 
        disabled={disabled}
      />
      
      <div className="bg-gray-700/50 p-4 rounded-full mb-4">
        <Upload size={32} className="text-indigo-400" />
      </div>
      
      <p className="text-lg font-medium text-gray-200">點擊或拖放圖片至此</p>
      <p className="text-sm text-gray-400 mt-2">支援 JPG, PNG (可多選)</p>
    </div>
  );
};
