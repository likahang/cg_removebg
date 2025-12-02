import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { Button } from './components/Button';
import { ImageEditor } from './components/ImageEditor';
import { editImageBackground } from './services/geminiService';
import { AppStatus, HistoryItem } from './types';
import { Download, Trash2, Layers, Image as ImageIcon, CheckCircle, AlertCircle, Loader2, UploadCloud } from 'lucide-react';

const App: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    if (history.length > 0 && !selectedId) {
      setSelectedId(history[0].id);
    }
  }, [history, selectedId]);

  const handleFilesSelected = (files: File[]) => {
    setIsDragging(false);
    dragCounter.current = 0;

    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) {
      if (files.length > 0) alert('請上傳有效的圖片檔案');
      return;
    }

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const newItem: HistoryItem = {
          id: newId,
          original: base64,
          result: null,
          originalName: file.name,
          resultFilename: null,
          status: AppStatus.PROCESSING,
          timestamp: Date.now()
        };
        setHistory(prev => [newItem, ...prev]);
        setSelectedId(newId);
        processImageRemoval(newId, base64, file.name);
      };
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;
      if (e.dataTransfer && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        setIsDragging(false);
        dragCounter.current = 0;
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) setIsDragging(true);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFilesSelected(Array.from(e.dataTransfer.files));
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [isDragging]);

  const processImageRemoval = async (id: string, base64Image: string, originalName?: string) => {
    try {
      const { blob: resultBlob, filename } = await editImageBackground(base64Image, originalName);
      const blobUrl = URL.createObjectURL(resultBlob);
      // derive fallback filename from originalName if server didn't provide one
      const fallback = originalName ? (originalName.replace(/\.[^.]+$/, '') + '.png') : `removed-${id}.png`;
      const resultFilename = filename || fallback;
      setHistory(prev => prev.map(item =>
        item.id === id
          ? { ...item, status: AppStatus.SUCCESS, result: blobUrl, resultFilename }
          : item
      ));
    } catch (error: any) {
      console.error(error);
      setHistory(prev => prev.map(item => 
        item.id === id 
          ? { ...item, status: AppStatus.ERROR, errorMessage: error.message || "處理失敗" } 
          : item
      ));
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    if (selectedId === id) {
      setSelectedId(newHistory.length > 0 ? newHistory[0].id : null);
    }
  };

  const handleDownload = (item: HistoryItem) => {
    if (item.result) {
      const link = document.createElement('a');
      link.href = item.result;
      // prefer server-provided filename, then resultFilename, then originalName-based fallback
      const filename = item.resultFilename || (item.originalName ? item.originalName.replace(/\.[^.]+$/, '') + '.png' : `removed-${item.id}.png`);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSaveEdit = (editedImageUrl: string) => {
    if (activeItem) {
      // 釋放舊的 blob URL
      if (activeItem.result) {
        URL.revokeObjectURL(activeItem.result);
      }
      // 更新歷史紀錄中的結果
      setHistory(prev => prev.map(item =>
        item.id === activeItem.id
          ? { ...item, result: editedImageUrl }
          : item
      ));
    }
  };

  const handleCancelEdit = () => {
    // 取消編輯不做任何事，因為編輯器是持久顯示的
  };

  const getActiveItem = () => {
    return history.find(item => item.id === selectedId) || null;
  };

  const activeItem = getActiveItem();

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 flex flex-col font-sans selection:bg-indigo-500/30 relative">
      {isDragging && (
        <div className="fixed inset-0 z-[100] bg-indigo-900/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in pointer-events-none transition-all duration-300">
          <div className="bg-white p-8 rounded-full shadow-2xl shadow-indigo-500/50 mb-6 animate-bounce">
            <UploadCloud size={64} className="text-indigo-600" />
          </div>
          <h2 className="text-4xl font-bold text-white drop-shadow-md">釋放以開始上傳</h2>
          <p className="text-indigo-200 mt-4 text-xl font-light">支援同時多張圖片去背</p>
        </div>
      )}

      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0f172a]/80 border-b border-gray-800/60 h-16">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Layers className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              CG專用自動去背
            </h1>
          </div>
          <div className="text-xs text-gray-500 font-mono hidden sm:block">
            Focus v1.0.0 (local)
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col gap-4">
        <div className="flex flex-grow gap-4 overflow-hidden">
          {/* 主預覽區域 - 僅在未處理或處理中時顯示 */}
          {(!activeItem || activeItem.status !== AppStatus.SUCCESS) && (
          <div className="flex flex-col flex-grow bg-gray-800/40 border border-gray-700/50 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm transition-all duration-300">
          <div className="flex-grow relative bg-gray-900/50 overflow-hidden flex items-center justify-center p-8">
            <div className="absolute inset-0 pointer-events-none opacity-20" 
                  style={{
                    backgroundImage: `linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)`,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                  }}
            />

            {!activeItem && (
               <div className="text-center z-10 w-full max-w-3xl">
                 <h2 className="text-3xl font-bold text-gray-100 mb-4">拖曳圖片至此處開始去背</h2>
                 <p className="text-gray-400 mb-8 text-lg">或點擊下方按鈕選擇圖片</p>
                 <ImageUploader 
                   onFilesSelected={handleFilesSelected} 
                   disabled={false} 
                 />
                 <p className="mt-8 text-sm text-gray-500 leading-relaxed">
                   支援 JPG、PNG 等常見格式 ·  
                   <span className="text-indigo-400"> 可同時上傳多張圖片</span>
                 </p>
               </div>
            )}
            {activeItem && activeItem.status === AppStatus.PROCESSING && (
               <div className="flex flex-col items-center justify-center">
                  <svg className="cg-indigo-loader" width="200" height="120" viewBox="600 330 200 120">
                    <g className="track-layer" fill="none" strokeWidth="7" strokeMiterlimit="10">
                      <path d="M765.2,374.7c-7.1-10.1-18.8-16.7-32.1-16.7c-21.6,0-39.2,17.5-39.2,39.2s-17.5,39.2-39.2,39.2c-21.6,0-39.2-17.5-39.2-39.2c0-21.6,17.5-39.2,39.2-39.2c13.3,0,25,6.6,32.1,16.8"/>
                      <path d="M701,419.5c7.1,10.1,18.8,16.8,32.1,16.8c21.6,0,39.2-17.5,39.2-39.2H733l39.2,0"/>
                    </g>
                    <g className="anim-layer" fill="none" strokeWidth="7" strokeLinecap="round" strokeMiterlimit="10">
                      <path className="part-1" d="M765.2,374.7c-7.1-10.1-18.8-16.7-32.1-16.7c-21.6,0-39.2,17.5-39.2,39.2s-17.5,39.2-39.2,39.2c-21.6,0-39.2-17.5-39.2-39.2c0-21.6,17.5-39.2,39.2-39.2c13.3,0,25,6.6,32.1,16.8"/>
                      <path className="part-2" d="M701,419.5c7.1,10.1,18.8,16.8,32.1,16.8c21.6,0,39.2-17.5,39.2-39.2H733l39.2,0"/>
                    </g>
                  </svg>
                  <p className="text-xl font-light text-gray-300 mt-6">正在幫你去背...</p>
                  <div className="mt-8 opacity-50 scale-75 blur-[2px]">
                     <img src={activeItem.original} className="max-h-32 rounded-lg" alt="Processing source" />
                  </div>
               </div>
            )}
            {activeItem && activeItem.status === AppStatus.ERROR && (
              <div className="text-center max-w-md">
                 <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                 <h3 className="text-xl font-bold text-red-400 mb-2">處理失敗</h3>
                 <p className="text-gray-400">{activeItem.errorMessage}</p>
              </div>
            )}
          </div>
          </div>
          )}

          {/* 編輯器區域 - 去背完成後自動顯示並佔據全寬 */}
          {activeItem && activeItem.status === AppStatus.SUCCESS && activeItem.result && activeItem.original && (
            <div className="flex-grow flex flex-col bg-gray-800/40 border border-gray-700/50 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm animate-fade-in">
              <ImageEditor
                imageUrl={activeItem.result}
                originalImageUrl={activeItem.original}
                filename={activeItem.originalName}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
              />
            </div>
          )}
        </div>

        {/* 生成紀錄 - 始終顯示在底部 */}
        <div className="h-36 bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4 flex flex-col flex-shrink-0">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1 flex justify-between items-center">
            <span>生成紀錄 ({history.length})</span>
            {history.length > 0 && <span className="text-gray-600">捲動查看更多</span>}
          </div>
          <div className="flex-grow overflow-x-auto overflow-y-hidden custom-scrollbar">
            <div className="flex space-x-3 h-full pb-1 min-w-max">
              {history.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`
                    group relative w-20 h-20 rounded-xl border-2 cursor-pointer transition-all duration-200 overflow-hidden flex-shrink-0
                    ${selectedId === item.id 
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30 scale-100 z-10' 
                      : 'border-gray-700 opacity-60 hover:opacity-100 hover:border-gray-500 hover:scale-105'}
                  `}
                >
                  <div className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage: `linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)`,
                      backgroundSize: '10px 10px',
                      backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px'
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                     {item.status === AppStatus.SUCCESS && item.result ? (
                      <img src={item.result} className="w-full h-full object-contain p-1" alt="Result preview" />
                     ) : item.status === AppStatus.PROCESSING ? (
                       <div className="flex flex-col items-center gap-2">
                         <Loader2 size={20} className="text-indigo-400 animate-spin" />
                         <img src={item.original} className="w-full h-full object-cover opacity-30 absolute inset-0" alt="Processing" />
                       </div>
                     ) : item.status === AppStatus.ERROR ? (
                       <div className="flex flex-col items-center gap-2">
                         <AlertCircle size={20} className="text-red-400" />
                         <img src={item.original} className="w-full h-full object-cover opacity-20 absolute inset-0" alt="Error" />
                       </div>
                     ) : (
                       <img src={item.original} className="w-full h-full object-cover opacity-40" alt="Original" />
                     )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 backdrop-blur-sm"
                    title="移除"
                  >
                    <Trash2 size={10} />
                  </button>
                  <div className={`absolute bottom-1 right-1 w-2 h-2 rounded-full border border-black/50 ${
                    item.status === AppStatus.SUCCESS ? 'bg-green-400' :
                    item.status === AppStatus.PROCESSING ? 'bg-yellow-400 animate-pulse' :
                    'bg-red-400'
                  }`}></div>
                </div>
              ))}
              {history.length === 0 && (
                <div className="w-full flex items-center justify-center text-gray-600 text-sm italic">
                  暫無紀錄
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.8);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.6);
        }
        
        /* CG Indigo Loader */
        .cg-indigo-loader .track-layer path {
          stroke: #6366f1;
          opacity: 0.2;
        }
        .cg-indigo-loader .anim-layer path {
          stroke: #6366f1;
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
        }
        .cg-indigo-loader .part-1 {
          animation: write-c 4s ease-in-out infinite;
        }
        .cg-indigo-loader .part-2 {
          animation: write-g 4s ease-in-out infinite;
        }
        @keyframes write-c {
          0% { stroke-dashoffset: 1000; opacity: 1; }
          25% { stroke-dashoffset: 0; }
          50% { stroke-dashoffset: 0; }
          65% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 1000; opacity: 1; }
        }
        @keyframes write-g {
          0% { stroke-dashoffset: 1000; opacity: 1; }
          25% { stroke-dashoffset: 1000; }
          50% { stroke-dashoffset: 0; }
          75% { stroke-dashoffset: 0; }
          90% { stroke-dashoffset: -1000; opacity: 1; }
          95% { opacity: 0; }
          100% { stroke-dashoffset: -1000; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default App;
