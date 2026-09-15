import React from 'react';
import { RotateCcw, Play, CheckCircle2, History, Trash2 } from 'lucide-react';
import { FrameItem } from '../types';

interface ResumeDialogProps {
  savedFrames: FrameItem[];
  onConfirmResume: () => void;
  onConfirmStartFresh: () => void;
}

export const ResumeDialog: React.FC<ResumeDialogProps> = ({
  savedFrames,
  onConfirmResume,
  onConfirmStartFresh,
}) => {
  const latestFrame = savedFrames[savedFrames.length - 1];
  const firstFrame = savedFrames[0];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-fade-in text-neutral-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-['Zen_Maru_Gothic']">
              前回の続きから再開しますか？
            </h3>
            <p className="text-xs text-neutral-400">
              IndexedDBに保存されたプロジェクトが見つかりました
            </p>
          </div>
        </div>

        {/* Thumbnail Preview Card */}
        <div className="bg-neutral-950 rounded-2xl p-3 border border-neutral-800 mb-6">
          <div className="aspect-[3/2] w-full rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 relative mb-3">
            {latestFrame ? (
              <img
                src={latestFrame.url}
                alt="前回の最新コマ"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600">
                プレビューなし
              </div>
            )}
            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded text-xs font-mono font-bold text-white border border-white/10">
              最終コマ (全{savedFrames.length}コマ)
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span>保存形式: IndexedDB (端末内)</span>
            <span className="text-amber-400 font-mono font-bold">{savedFrames.length} コマ保存済</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            id="btn-confirm-resume"
            onClick={onConfirmResume}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>前回の続きから再開する</span>
          </button>

          <button
            id="btn-confirm-fresh"
            onClick={onConfirmStartFresh}
            className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 border border-neutral-700/60 hover:border-rose-800/80 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>保存データを破棄して新しく始める</span>
          </button>
        </div>
      </div>
    </div>
  );
};
