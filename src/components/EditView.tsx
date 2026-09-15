import React, { useState, useRef } from 'react';
import {
  Trash2,
  MoveLeft,
  MoveRight,
  Copy,
  CheckSquare,
  Square,
  ImagePlus,
  Play,
  Download,
  AlertTriangle,
  ArrowUpDown,
} from 'lucide-react';
import { FrameItem } from '../types';
import { triggerDownload } from '../services/videoExport';

interface EditViewProps {
  frames: FrameItem[];
  onReorder: (newOrderedIds: number[]) => void;
  onDeleteMultiple: (ids: number[]) => void;
  onDuplicateFrame: (frame: FrameItem) => void;
  onUploadImage: (file: File) => void;
  onOpenPlayback: () => void;
}

export const EditView: React.FC<EditViewProps> = ({
  frames,
  onReorder,
  onDeleteMultiple,
  onDuplicateFrame,
  onUploadImage,
  onOpenPlayback,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Toggle selection for an individual frame
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all or clear
  const selectAll = () => {
    if (selectedIds.size === frames.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(frames.map((f) => f.id)));
    }
  };

  // Delete selected frames with confirmation
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`選択した ${selectedIds.size} コマを削除してもよろしいですか？`)) {
      onDeleteMultiple(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  // Move frame left
  const moveLeft = (index: number) => {
    if (index <= 0) return;
    const newFrames = [...frames];
    const temp = newFrames[index - 1];
    newFrames[index - 1] = newFrames[index];
    newFrames[index] = temp;
    onReorder(newFrames.map((f) => f.id));
  };

  // Move frame right
  const moveRight = (index: number) => {
    if (index >= frames.length - 1) return;
    const newFrames = [...frames];
    const temp = newFrames[index + 1];
    newFrames[index + 1] = newFrames[index];
    newFrames[index] = temp;
    onReorder(newFrames.map((f) => f.id));
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag preview or default
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newFrames = [...frames];
    const [movedItem] = newFrames.splice(draggedIndex, 1);
    newFrames.splice(targetIndex, 0, movedItem);

    setDraggedIndex(null);
    setDragOverIndex(null);
    onReorder(newFrames.map((f) => f.id));
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Download single JPEG
  const downloadSingleFrame = (frame: FrameItem, index: number) => {
    const filename = `frame_${String(index + 1).padStart(3, '0')}.jpg`;
    triggerDownload(frame.blob, filename);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      onUploadImage(files[i]);
    }
    e.target.value = '';
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-4 px-2 sm:px-4">
      {/* Top Action Toolbar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base sm:text-lg text-white font-['Zen_Maru_Gothic']">
              コマの並べ替え・編集
            </h2>
            <span className="text-xs bg-neutral-800 text-amber-400 font-mono font-bold px-2 py-0.5 rounded-full border border-neutral-700">
              全 {frames.length} コマ
            </span>
          </div>
          <p className="text-xs text-neutral-400 hidden md:block">
            ドラッグ＆ドロップまたは「◀」「▶」で順番を変更できます
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 flex items-center gap-1.5 transition-colors"
          >
            <ImagePlus className="w-3.5 h-3.5 text-amber-400" />
            <span>画像を取り込む</span>
          </button>

          {/* Select All */}
          {frames.length > 0 && (
            <button
              onClick={selectAll}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 flex items-center gap-1.5 transition-colors"
            >
              {selectedIds.size === frames.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              <span>
                {selectedIds.size === frames.length ? '選択解除' : 'すべて選択'}
              </span>
            </button>
          )}

          {/* Batch Delete */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-colors animate-pulse"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>選択した {selectedIds.size} コマを削除</span>
            </button>
          )}

          {/* Quick Playback Preview */}
          {frames.length > 0 && (
            <button
              onClick={onOpenPlayback}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>プレビュー再生</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Frames */}
      {frames.length === 0 ? (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-800 mx-auto mb-4 flex items-center justify-center text-neutral-500">
            <ArrowUpDown className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-white mb-2">まだコマがありません</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-5">
            「撮影」画面からカメラで撮影するか、画像ファイルを追加してコマ撮りを開始しましょう。
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs inline-flex items-center gap-2"
          >
            <ImagePlus className="w-4 h-4" />
            <span>画像を読み込む</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {frames.map((frame, index) => {
            const isSelected = selectedIds.has(frame.id);
            const isDragging = draggedIndex === index;
            const isOver = dragOverIndex === index;

            return (
              <div
                key={frame.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`group relative bg-neutral-900 rounded-xl border-2 overflow-hidden transition-all duration-150 flex flex-col ${
                  isOver
                    ? 'border-amber-400 scale-105 z-10'
                    : isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500/30'
                    : isDragging
                    ? 'opacity-40 border-neutral-700'
                    : 'border-neutral-800 hover:border-neutral-600'
                }`}
              >
                {/* Frame Image with 3:2 aspect ratio */}
                <div
                  className="relative aspect-[3/2] w-full bg-neutral-950 overflow-hidden cursor-pointer"
                  onClick={() => toggleSelect(frame.id)}
                >
                  <img
                    src={frame.url}
                    alt={`コマ #${index + 1}`}
                    className="w-full h-full object-cover select-none"
                    referrerPolicy="no-referrer"
                  />

                  {/* Frame Order Index */}
                  <div className="absolute top-1.5 left-1.5 bg-neutral-950/80 backdrop-blur-xs px-2 py-0.5 rounded text-xs font-mono font-bold text-white border border-neutral-700">
                    #{index + 1}
                  </div>

                  {/* Selection Checkbox */}
                  <div
                    className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-amber-500 border-amber-400 text-neutral-950'
                        : 'bg-black/50 border-white/40 text-transparent group-hover:border-white'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4 fill-current" />
                  </div>
                </div>

                {/* Card Control Buttons */}
                <div className="p-2 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between text-neutral-400 text-xs">
                  {/* Reordering arrows */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveLeft(index)}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-neutral-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                      title="前へ移動"
                    >
                      <MoveLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveRight(index)}
                      disabled={index === frames.length - 1}
                      className="p-1 rounded hover:bg-neutral-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                      title="次へ移動"
                    >
                      <MoveRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Action icons: Duplicate, Download JPEG, Single Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onDuplicateFrame(frame)}
                      className="p-1 rounded hover:bg-neutral-800 hover:text-amber-400"
                      title="このコマを複製"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => downloadSingleFrame(frame, index)}
                      className="p-1 rounded hover:bg-neutral-800 hover:text-white"
                      title="JPEGとしてダウンロード"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`コマ #${index + 1} を削除しますか？`)) {
                          onDeleteMultiple([frame.id]);
                        }
                      }}
                      className="p-1 rounded hover:bg-rose-950/60 hover:text-rose-400"
                      title="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
