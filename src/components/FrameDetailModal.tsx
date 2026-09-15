import React, { useState } from 'react';
import { X, Trash2, Download, Copy, Calendar, Film, AlertTriangle } from 'lucide-react';
import { FrameItem } from '../types';
import { triggerDownload } from '../services/videoExport';

interface FrameDetailModalProps {
  frame: FrameItem | null;
  totalFrames: number;
  onClose: () => void;
  onDelete: (id: number) => void;
  onDuplicate: (frame: FrameItem) => void;
}

export const FrameDetailModal: React.FC<FrameDetailModalProps> = ({
  frame,
  totalFrames,
  onClose,
  onDelete,
  onDuplicate,
}) => {
  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false);

  if (!frame) return null;

  const downloadFrame = () => {
    const filename = `frame_${String(frame.order + 1).padStart(3, '0')}.jpg`;
    triggerDownload(frame.blob, filename);
  };

  const formattedDate = new Date(frame.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl text-neutral-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-lg text-xs border border-amber-500/30">
              コマ #{frame.order + 1} / {totalFrames}
            </span>
            <span className="text-xs text-neutral-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formattedDate} 撮影
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Large Frame Image Container (3:2) */}
        <div className="aspect-[3/2] w-full rounded-2xl overflow-hidden bg-black border border-neutral-800 relative mb-4 shadow-inner">
          <img
            src={frame.url}
            alt={`コマ #${frame.order + 1}`}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />

          {/* Delete confirmation banner inside modal */}
          {confirmingDelete && (
            <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-rose-950/80 text-rose-400 border border-rose-800 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-white text-sm mb-1">コマ #{frame.order + 1} を削除しますか？</h4>
              <p className="text-xs text-neutral-400 max-w-xs mb-4">
                このコマを削除すると、後続のコマの順番が自動で繰り上がります。
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    onDelete(frame.id);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-colors"
                >
                  はい、削除する
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!confirmingDelete && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              onClick={() => setConfirmingDelete(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white border border-rose-800/80 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>このコマを削除</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onDuplicate(frame);
                  onClose();
                }}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>コマを複製</span>
              </button>

              <button
                onClick={downloadFrame}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JPEG保存</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
