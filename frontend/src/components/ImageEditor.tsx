import React, { useRef, useEffect, useState } from 'react';
import { Eraser, Undo, Redo, Download, Brush, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface ImageEditorProps {
  imageUrl: string;
  originalImageUrl: string;
  filename?: string;
  onSave: (editedImageUrl: string) => void;
  onCancel: () => void;
}

type BrushMode = 'erase' | 'restore';

export const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, originalImageUrl, filename, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [brushMode, setBrushMode] = useState<BrushMode>('erase');
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      
      // 使用容器的實際尺寸
      const container = containerRef.current;
      if (!container) return;
      
      const containerWidth = container.clientWidth - 32; // 扣除 padding
      const containerHeight = container.clientHeight - 32;
      
      let width = img.width;
      let height = img.height;
      
      // 計算縮放比例，使圖片盡可能填滿容器但不超出
      const widthRatio = containerWidth / width;
      const heightRatio = containerHeight / height;
      const scale = Math.min(widthRatio, heightRatio); // 選擇較小的比例，確保完全適應
      
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
      
      canvas.width = width;
      canvas.height = height;
      
      const cursorCanvas = cursorCanvasRef.current;
      if (cursorCanvas) {
        cursorCanvas.width = width;
        cursorCanvas.height = height;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialState]);
      setHistoryIndex(0);
    };
    img.src = imageUrl;

    const originalImg = new Image();
    originalImg.crossOrigin = 'anonymous';
    originalImg.onload = () => {
      originalImageRef.current = originalImg;
    };
    originalImg.src = originalImageUrl;
  }, [imageUrl, originalImageUrl]);

  useEffect(() => {
    const cursorCanvas = cursorCanvasRef.current;
    if (!cursorCanvas || !cursorPos) return;

    const ctx = cursorCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

    const color = brushMode === 'erase' ? '255, 0, 0' : '0, 255, 0';
    
    ctx.beginPath();
    ctx.arc(cursorPos.x, cursorPos.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color}, 0.3)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${color}, 0.8)`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [cursorPos, brushSize, brushMode]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const newIndex = historyIndex - 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const newIndex = historyIndex + 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setLastPos(pos);
    saveState();
    if (brushMode === 'erase') {
      erase(pos.x, pos.y);
    } else {
      restore(pos.x, pos.y);
    }
  };

  const drawLine = (x0: number, y0: number, x1: number, y1: number) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const steps = Math.max(Math.ceil(distance / (brushSize / 4)), 1);
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + dx * t;
      const y = y0 + dy * t;
      
      if (brushMode === 'erase') {
        erase(x, y);
      } else {
        restore(x, y);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setCursorPos(pos);
    if (isDrawing && lastPos) {
      drawLine(lastPos.x, lastPos.y, pos.x, pos.y);
      setLastPos(pos);
    }
  };

  const handleMouseLeave = () => {
    setCursorPos(null);
    setLastPos(null);
    if (isDrawing) {
      setIsDrawing(false);
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setLastPos(null);
    }
  };

  const erase = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  };

  const restore = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const originalImg = originalImageRef.current;
    if (!canvas || !originalImg) return;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.clip();
    
    const scale = canvas.width / originalImg.width;
    ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);
    
    ctx.restore();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 直接下載圖片
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        // 使用原始檔名，移除副檔名後加上 .png
        const baseName = filename ? filename.replace(/\.[^.]+$/, '') : `edited-${Date.now()}`;
        link.download = `${baseName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // 同時更新預覽
        const previewUrl = URL.createObjectURL(blob);
        onSave(previewUrl);
      }
    }, 'image/png');
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* 左側：畫布區域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 標題列 */}
        <div className="p-4 border-b border-gray-700/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Eraser className="text-indigo-400" size={20} />
            手動修飾
          </h2>
        </div>

        {/* 畫布區域 */}
        <div ref={containerRef} className="flex-1 relative bg-gray-900/50 overflow-hidden flex items-center justify-center p-4 min-h-0">
          <div className="absolute inset-0 pointer-events-none opacity-20" 
                style={{
                  backgroundImage: `linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)`,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }}
          />
          <div className="relative inline-block z-10">
            {showOriginal && originalImageRef.current && (
              <img
                src={originalImageUrl}
                alt="Original background"
                className="absolute top-0 left-0 opacity-20 pointer-events-none"
                style={{
                  width: canvasRef.current?.width || 'auto',
                  height: canvasRef.current?.height || 'auto',
                  imageRendering: 'crisp-edges'
                }}
              />
            )}
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={handleMouseMove}
              onMouseUp={stopDrawing}
              onMouseLeave={handleMouseLeave}
              className="cursor-none relative z-10"
              style={{
                imageRendering: 'crisp-edges'
              }}
            />
            <canvas
              ref={cursorCanvasRef}
              className="absolute top-0 left-0 pointer-events-none z-20"
              style={{
                imageRendering: 'crisp-edges'
              }}
            />
          </div>
        </div>
      </div>

      {/* 右側：工具列 */}
      <div className="w-80 border-l border-gray-700/50 flex flex-col bg-gray-900/30 p-6 space-y-4">
        {/* 模式選擇 */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">模式</label>
          <div className="flex gap-2">
            <Button
              variant={brushMode === 'erase' ? 'primary' : 'secondary'}
              onClick={() => {
                setBrushMode('erase');
                setShowOriginal(false);
              }}
              icon={<Eraser size={16} />}
              className="flex-1 px-3 py-2 text-sm"
            >
              擦除
            </Button>
            <Button
              variant={brushMode === 'restore' ? 'primary' : 'secondary'}
              onClick={() => {
                setBrushMode('restore');
                setShowOriginal(true);
              }}
              icon={<RotateCcw size={16} />}
              className="flex-1 px-3 py-2 text-sm"
            >
              還原
            </Button>
          </div>
        </div>

        {/* 筆刷大小 */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
            <span>筆刷大小</span>
            <span className="text-indigo-400 font-mono">{brushSize}px</span>
          </label>
          <div className="flex items-center gap-3">
            <Brush size={14} className="text-gray-500" />
            <input
              type="range"
              min="5"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="flex-1 accent-indigo-500"
            />
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">歷史記錄</label>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={undo}
              disabled={historyIndex <= 0}
              icon={<Undo size={16} />}
              className="flex-1 px-3 py-2 text-sm"
              title="上一步"
            >
              復原
            </Button>
            <Button
              variant="secondary"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              icon={<Redo size={16} />}
              className="flex-1 px-3 py-2 text-sm"
              title="下一步"
            >
              重做
            </Button>
          </div>
        </div>

        {/* 提示文字 */}
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          <span className="text-red-400 font-semibold">擦除</span>：塗抹移除 · 
          <span className="text-green-400 font-semibold">還原</span>：恢復原圖
        </p>

        {/* 底部按鈕 */}
        <div className="pt-2">
          <Button
            variant="primary"
            onClick={handleSave}
            icon={<Download size={16} />}
            className="w-full"
          >
            下載此圖片
          </Button>
        </div>
      </div>
    </div>
  );
};
