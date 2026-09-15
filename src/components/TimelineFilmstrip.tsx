import React, { useRef, useEffect } from 'react';
import { Plus, ImagePlus, ArrowRight, Trash2, Eye } from 'lucide-react';
import { FrameItem } from '../types';

interface TimelineFilmstripProps {
  frames: FrameItem[];
  onUploadImage: (file: File) => void;
  onOpenEditTab: () => void;
  onDeleteFrame: (id: number) => void;
  onSelectFramePreview: (frame: FrameItem) => void;
}

export const TimelineFilmstrip: React.FC<TimelineFilmstripProps> = ({
  frames,
  onUploadImage,
  onOpenEditTab,
  onDeleteFrame,
  onSelectFramePreview,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto scroll to the end when new frames arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [frames.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      onUploadImage(files[i]);
    }
    e.target.value = '';
  };

  return (
    <div className="w-full max-w-4xl mt-6 bg-neutral-900/90 backdrop-blur rounded-2xl border border-neutral-800 p-3 shadow-lg">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs sm:text-sm text-neutral-200">
            タイムライン（コマ一覧）
          </span>
          <span className="text-[11px] text-neutral-400">
            {frames.length === 0 ? '撮影したコマがここに並びます' : `${frames.length}コマ`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Upload image button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            id="btn-upload-image-strip"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="画像を読み込んでコマに追加 (720x480に自動トリミング)"
          >
            <ImagePlus className="w-3.5 h-3.5 text-amber-400" />
            <span>画像を追加</span>
          </button>

          {/* Jump to full edit / reorder */}
          {frames.length > 0 && (
            <button
              id="btn-open-edit-strip"
              onClick={onOpenEditTab}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>並べ替え・詳細</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Filmstrip Scroller */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent"
        style={{ scrollBehavior: 'smooth' }}
      >
        {frames.length === 0 ? (
          <div className="w-full h-24 border border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center text-neutral-500 text-xs gap-1.5">
            <span>まだ撮影されたコマはありません</span>
            <span className="text-[10px] text-neutral-600">
              シャッターボタンを押すか、画像ファイルを取り込んでください
            </span>
          </div>
        ) : (
          frames.map((frame, index) => {
            const isLast = index === frames.length - 1;
            return (
              <div
                key={frame.id}
                className={`group relative flex-shrink-0 w-28 sm:w-32 aspect-[3/2] rounded-xl overflow-hidden border-2 transition-all cursor-pointer select-none ${
                  isLast
                    ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-md shadow-amber-500/10'
                    : 'border-neutral-800 hover:border-neutral-600'
                }`}
                onClick={() => onSelectFramePreview(frame)}
              >
                <img
                  src={frame.url}
                  alt={`コマ #${index + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />

                {/* Frame Index Badge */}
                <div className="absolute top-1 left-1 bg-black/75 backdrop-blur-xs px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-neutral-200 border border-white/10">
                  #{index + 1}
                </div>

                {isLast && (
                  <div className="absolute bottom-1 right-1 bg-amber-500 text-neutral-950 font-bold text-[9px] px-1.5 py-0.2 rounded shadow">
                    最新
                  </div>
                )}

                {/* Delete button (accessible on touch, clear tooltip) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFrame(frame.id);
                  }}
                  className="absolute top-1 right-1 p-1.5 bg-black/75 hover:bg-rose-600 text-neutral-300 hover:text-white rounded-lg border border-white/10 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer shadow"
                  title={`コマ #${index + 1} を削除`}
                  aria-label={`コマ #${index + 1} を削除`}
                >
                  <Trash2 className="w-3 h-3 text-rose-400 hover:text-white" />
                </button>
              </div>
            );
          })
        )}

        {/* Append helper placeholder */}
        {frames.length > 0 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-24 aspect-[3/2] rounded-xl border border-dashed border-neutral-700/60 hover:border-amber-500/50 bg-neutral-850/50 hover:bg-neutral-800/80 flex flex-col items-center justify-center text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer"
            title="画像を追加"
          >
            <Plus className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">画像追加</span>
          </button>
        )}
      </div>
    </div>
  );
};
