import React, { useState, useRef } from 'react';
import {
  Trash2,
  MoveLeft,
  MoveRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  CheckSquare,
  Square,
  ImagePlus,
  Play,
  Download,
  Clock,
  Layers,
  LayoutGrid,
  ArrowRight,
  GripVertical,
  HelpCircle,
} from 'lucide-react';
import { FrameItem } from '../types';
import { triggerDownload } from '../services/videoExport';

interface EditViewProps {
  frames: FrameItem[];
  frameRate: number;
  onReorder: (newOrderedIds: number[]) => void;
  onDeleteMultiple: (ids: number[]) => void;
  onDuplicateFrame: (frame: FrameItem) => void;
  onUploadImage: (file: File) => void;
  onOpenPlayback: () => void;
  onRequestDeleteSingle: (frame: FrameItem) => void;
}

export const EditView: React.FC<EditViewProps> = ({
  frames,
  frameRate,
  onReorder,
  onDeleteMultiple,
  onDuplicateFrame,
  onUploadImage,
  onOpenPlayback,
  onRequestDeleteSingle,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
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

  // Move frame 1 step left
  const moveLeft = (index: number) => {
    if (index <= 0) return;
    const newFrames = [...frames];
    const temp = newFrames[index - 1];
    newFrames[index - 1] = newFrames[index];
    newFrames[index] = temp;
    setFocusedIndex(index - 1);
    onReorder(newFrames.map((f) => f.id));
  };

  // Move frame 1 step right
  const moveRight = (index: number) => {
    if (index >= frames.length - 1) return;
    const newFrames = [...frames];
    const temp = newFrames[index + 1];
    newFrames[index + 1] = newFrames[index];
    newFrames[index] = temp;
    setFocusedIndex(index + 1);
    onReorder(newFrames.map((f) => f.id));
  };

  // Move frame to very beginning
  const moveToStart = (index: number) => {
    if (index === 0) return;
    const newFrames = [...frames];
    const [item] = newFrames.splice(index, 1);
    newFrames.unshift(item);
    setFocusedIndex(0);
    onReorder(newFrames.map((f) => f.id));
  };

  // Move frame to very end
  const moveToEnd = (index: number) => {
    if (index === frames.length - 1) return;
    const newFrames = [...frames];
    const [item] = newFrames.splice(index, 1);
    newFrames.push(item);
    setFocusedIndex(newFrames.length - 1);
    onReorder(newFrames.map((f) => f.id));
  };

  // Move to specific position
  const moveToPosition = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= frames.length || fromIndex === toIndex) return;
    const newFrames = [...frames];
    const [item] = newFrames.splice(fromIndex, 1);
    newFrames.splice(toIndex, 0, item);
    setFocusedIndex(toIndex);
    onReorder(newFrames.map((f) => f.id));
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
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
    setFocusedIndex(targetIndex);
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

  const activeFocusedFrame = frames[focusedIndex] || frames[0];
  const totalDuration = (frames.length / frameRate).toFixed(1);

  return (
    <div className="w-full max-w-6xl mx-auto py-3 px-2 sm:px-4">
      {/* Top Header & Mode Switcher */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base sm:text-lg text-white font-['Zen_Maru_Gothic'] flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <span>タイムライン＆コマ並べ替え</span>
            </h2>
            <span className="text-xs bg-neutral-800 text-amber-400 font-mono font-bold px-2.5 py-0.5 rounded-full border border-neutral-700">
              全 {frames.length} コマ ({totalDuration}秒)
            </span>
          </div>

          {/* View Mode Toggle: Timeline Ribbon vs Grid */}
          <div className="flex items-center bg-neutral-800 p-0.5 rounded-xl border border-neutral-700 text-xs">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                viewMode === 'timeline'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-300 hover:text-white'
              }`}
              title="横スクロールのタイムライン表示"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>タイムライン表示</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium ${
                viewMode === 'grid'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-300 hover:text-white'
              }`}
              title="全体を見渡すグリッド一覧表示"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>グリッド一覧</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Image Button */}
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
            className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ImagePlus className="w-3.5 h-3.5 text-amber-400" />
            <span>画像を追加</span>
          </button>

          {/* Select All */}
          {frames.length > 0 && (
            <button
              onClick={selectAll}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {selectedIds.size === frames.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              <span>{selectedIds.size === frames.length ? '選択解除' : 'すべて選択'}</span>
            </button>
          )}

          {/* Batch Delete */}
          {selectedIds.size > 0 && (
            <button
              onClick={() => onDeleteMultiple(Array.from(selectedIds))}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>選択した {selectedIds.size} コマを削除</span>
            </button>
          )}

          {/* Quick Playback Preview */}
          {frames.length > 0 && (
            <button
              onClick={onOpenPlayback}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>プレビュー再生</span>
            </button>
          )}
        </div>
      </div>

      {frames.length === 0 ? (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-800 mx-auto mb-4 flex items-center justify-center text-neutral-500">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-white mb-2">まだコマがありません</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-5">
            「撮影」画面からカメラで撮影するか、画像ファイルを追加してください。
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <ImagePlus className="w-4 h-4" />
            <span>画像を読み込む</span>
          </button>
        </div>
      ) : (
        <>
          {/* Active Frame Focus & Precision Reordering Inspector Bar */}
          {activeFocusedFrame && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-20 aspect-[3/2] rounded-xl overflow-hidden bg-black border border-neutral-700 shadow-inner flex-shrink-0">
                  <img
                    src={activeFocusedFrame.url}
                    alt={`コマ #${focusedIndex + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">
                      選択中: コマ #{focusedIndex + 1}
                    </span>
                    <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {(focusedIndex / frameRate).toFixed(2)} 秒目
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    ドラッグまたは下のボタンでタイムラインの任意の位置へ移動できます
                  </p>
                </div>
              </div>

              {/* Move Controls for the active frame */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => moveToStart(focusedIndex)}
                  disabled={focusedIndex === 0}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs flex items-center gap-1 border border-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 cursor-pointer"
                  title="タイムラインの先頭へ移動"
                >
                  <ChevronsLeft className="w-4 h-4" />
                  <span>先頭へ</span>
                </button>

                <button
                  onClick={() => moveLeft(focusedIndex)}
                  disabled={focusedIndex === 0}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 border border-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 cursor-pointer"
                  title="1コマ前へ移動"
                >
                  <MoveLeft className="w-4 h-4 text-amber-400" />
                  <span>1つ前へ</span>
                </button>

                <button
                  onClick={() => moveRight(focusedIndex)}
                  disabled={focusedIndex === frames.length - 1}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 border border-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 cursor-pointer"
                  title="1コマ後ろへ移動"
                >
                  <span>1つ後ろへ</span>
                  <MoveRight className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  onClick={() => moveToEnd(focusedIndex)}
                  disabled={focusedIndex === frames.length - 1}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs flex items-center gap-1 border border-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 cursor-pointer"
                  title="タイムラインの末尾へ移動"
                >
                  <span>末尾へ</span>
                  <ChevronsRight className="w-4 h-4" />
                </button>

                <div className="w-px h-6 bg-neutral-800 mx-1"></div>

                {/* Move to specific index input */}
                <div className="flex items-center gap-1 text-xs text-neutral-400">
                  <span>位置:</span>
                  <select
                    value={focusedIndex + 1}
                    onChange={(e) => moveToPosition(focusedIndex, parseInt(e.target.value, 10) - 1)}
                    className="bg-neutral-800 text-white rounded-lg px-2 py-1 border border-neutral-700 text-xs font-mono font-bold"
                  >
                    {frames.map((_, i) => (
                      <option key={i} value={i + 1}>
                        #{i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-px h-6 bg-neutral-800 mx-1"></div>

                {/* Direct Delete Button for this intermediate frame */}
                <button
                  onClick={() => onRequestDeleteSingle(activeFocusedFrame)}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 hover:text-white border border-rose-800/80 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="このコマを削除"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>このコマを削除</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 1: TIMELINE TRACK RIBBON (Super clear sequential timeline with timecodes and insertion indicators) */}
          {viewMode === 'timeline' ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3 text-xs text-neutral-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-amber-400" />
                  タイムラインレーン（左から右へ再生されます）
                </span>
                <span>カードをドラッグして希望の位置へドロップしてください</span>
              </div>

              {/* Scrollable Timeline Strip */}
              <div
                className="flex items-stretch gap-3 overflow-x-auto pb-4 pt-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent select-none"
                style={{ scrollBehavior: 'smooth' }}
              >
                {frames.map((frame, index) => {
                  const isFocused = focusedIndex === index;
                  const isSelected = selectedIds.has(frame.id);
                  const isDragging = draggedIndex === index;
                  const isOver = dragOverIndex === index;
                  const timeOffset = (index / frameRate).toFixed(1);

                  return (
                    <div key={frame.id} className="relative flex items-center">
                      {/* Visual Drop Insertion Indicator Bar */}
                      {isOver && draggedIndex !== null && draggedIndex !== index && (
                        <div className="absolute -left-2 top-0 bottom-0 w-1.5 bg-amber-400 rounded-full z-30 shadow-lg shadow-amber-400/50 animate-pulse">
                          <div className="absolute -top-3 -left-3 bg-amber-400 text-neutral-950 text-[9px] font-bold px-1 rounded shadow whitespace-nowrap">
                            ここへ移動
                          </div>
                        </div>
                      )}

                      {/* Timeline Card */}
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setFocusedIndex(index)}
                        className={`group relative flex-shrink-0 w-40 sm:w-44 bg-neutral-950 rounded-2xl border-2 transition-all duration-150 flex flex-col cursor-pointer overflow-hidden ${
                          isFocused
                            ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-xl shadow-amber-500/15'
                            : isSelected
                            ? 'border-amber-500 ring-2 ring-amber-500/20'
                            : isDragging
                            ? 'opacity-30 border-neutral-700 scale-95'
                            : 'border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {/* Frame Image Container */}
                        <div className="relative aspect-[3/2] w-full bg-black overflow-hidden">
                          <img
                            src={frame.url}
                            alt={`コマ #${index + 1}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />

                          {/* Order Badge */}
                          <div className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded-lg text-xs font-mono font-bold text-white border border-white/10">
                            #{index + 1}
                          </div>

                          {/* Timecode Badge */}
                          <div className="absolute bottom-1.5 left-1.5 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-neutral-300 border border-white/10">
                            {timeOffset}s
                          </div>

                          {/* Selection Checkbox */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(frame.id);
                            }}
                            className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'bg-amber-500 border-amber-400 text-neutral-950'
                                : 'bg-black/60 border-white/40 text-transparent hover:border-white'
                            }`}
                          >
                            <CheckSquare className="w-4 h-4 fill-current" />
                          </button>

                          {/* Drag Handle Indicator */}
                          <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center text-neutral-400 opacity-60 group-hover:opacity-100">
                            <GripVertical className="w-4 h-4" />
                          </div>
                        </div>

                        {/* Card Reordering & Delete Controls */}
                        <div className="p-2 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between text-neutral-400 text-xs">
                          {/* Step Buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveLeft(index);
                              }}
                              disabled={index === 0}
                              className="p-1 rounded hover:bg-neutral-800 hover:text-white disabled:opacity-30"
                              title="前へ移動"
                            >
                              <MoveLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveRight(index);
                              }}
                              disabled={index === frames.length - 1}
                              className="p-1 rounded hover:bg-neutral-800 hover:text-white disabled:opacity-30"
                              title="次へ移動"
                            >
                              <MoveRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Actions: Duplicate, Delete Intermediate Frame */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicateFrame(frame);
                              }}
                              className="p-1 rounded hover:bg-neutral-800 hover:text-amber-400"
                              title="このコマを複製"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRequestDeleteSingle(frame);
                              }}
                              className="p-1 rounded hover:bg-rose-950/80 hover:text-rose-400 text-rose-400/80"
                              title="このコマを削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Sequence Connector arrow between frames */}
                      {index < frames.length - 1 && (
                        <div className="flex items-center justify-center px-1 text-neutral-700">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* MODE 2: GRID OVERVIEW (For dense overview of 50-200 frames) */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {frames.map((frame, index) => {
                const isFocused = focusedIndex === index;
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
                    onClick={() => setFocusedIndex(index)}
                    className={`group relative bg-neutral-900 rounded-2xl border-2 overflow-hidden transition-all duration-150 flex flex-col cursor-pointer ${
                      isOver
                        ? 'border-amber-400 scale-105 z-10'
                        : isFocused
                        ? 'border-amber-400 ring-2 ring-amber-400/30'
                        : isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/20'
                        : isDragging
                        ? 'opacity-40 border-neutral-700'
                        : 'border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    <div className="relative aspect-[3/2] w-full bg-neutral-950 overflow-hidden">
                      <img
                        src={frame.url}
                        alt={`コマ #${index + 1}`}
                        className="w-full h-full object-cover select-none"
                        referrerPolicy="no-referrer"
                      />

                      {/* Order */}
                      <div className="absolute top-1.5 left-1.5 bg-neutral-950/80 backdrop-blur-xs px-2 py-0.5 rounded text-xs font-mono font-bold text-white border border-neutral-700">
                        #{index + 1}
                      </div>

                      {/* Selection */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(frame.id);
                        }}
                        className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-amber-500 border-amber-400 text-neutral-950'
                            : 'bg-black/50 border-white/40 text-transparent hover:border-white'
                        }`}
                      >
                        <CheckSquare className="w-4 h-4 fill-current" />
                      </button>
                    </div>

                    {/* Card controls */}
                    <div className="p-2 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between text-neutral-400 text-xs">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLeft(index);
                          }}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-neutral-800 hover:text-white disabled:opacity-30"
                          title="前へ移動"
                        >
                          <MoveLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveRight(index);
                          }}
                          disabled={index === frames.length - 1}
                          className="p-1 rounded hover:bg-neutral-800 hover:text-white disabled:opacity-30"
                          title="次へ移動"
                        >
                          <MoveRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateFrame(frame);
                          }}
                          className="p-1 rounded hover:bg-neutral-800 hover:text-amber-400"
                          title="このコマを複製"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadSingleFrame(frame, index);
                          }}
                          className="p-1 rounded hover:bg-neutral-800 hover:text-white"
                          title="JPEGダウンロード"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestDeleteSingle(frame);
                          }}
                          className="p-1 rounded hover:bg-rose-950/60 hover:text-rose-400 text-rose-400/80"
                          title="このコマを削除"
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
        </>
      )}
    </div>
  );
};
