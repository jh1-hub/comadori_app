import React, { useState } from 'react';
import {
  Download,
  Film,
  FolderArchive,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { FrameItem } from '../types';
import { exportVideo, exportZip, triggerDownload, ExportProgress } from '../services/videoExport';
import { ConfirmModal } from './ConfirmModal';

interface ExportViewProps {
  frames: FrameItem[];
  frameRate: number;
  onResetProject: () => void;
}

export const ExportView: React.FC<ExportViewProps> = ({
  frames,
  frameRate,
  onResetProject,
}) => {
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [exportedVideoFilename, setExportedVideoFilename] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Export video (WebM/MP4)
  const handleExportVideo = async () => {
    if (frames.length === 0 || isExportingVideo) return;
    try {
      setIsExportingVideo(true);
      setSuccessMessage(null);
      setErrorMessage(null);
      setExportedVideoUrl(null);

      const result = await exportVideo(frames, frameRate, (p) => setProgress(p));
      const url = URL.createObjectURL(result.blob);
      setExportedVideoUrl(url);
      setExportedVideoFilename(result.filename);
      triggerDownload(result.blob, result.filename);
      setSuccessMessage(`動画「${result.filename}」の書き出しが完了しました！`);
    } catch (err: unknown) {
      console.error('Video export error:', err);
      const msg = err instanceof Error ? err.message : '不明なエラー';
      setErrorMessage(`動画の書き出しに失敗しました: ${msg}`);
    } finally {
      setIsExportingVideo(false);
      setProgress(null);
    }
  };

  // Export ZIP of all JPEGs
  const handleExportZip = async () => {
    if (frames.length === 0 || isExportingZip) return;
    try {
      setIsExportingZip(true);
      setSuccessMessage(null);
      setErrorMessage(null);

      const result = await exportZip(frames, (p) => setProgress(p));
      triggerDownload(result.blob, result.filename);
      setSuccessMessage(`全コマ画像ZIP「${result.filename}」をダウンロードしました！`);
    } catch (err: unknown) {
      console.error('ZIP export error:', err);
      const msg = err instanceof Error ? err.message : '不明なエラー';
      setErrorMessage(`ZIPの書き出しに失敗しました: ${msg}`);
    } finally {
      setIsExportingZip(false);
      setProgress(null);
    }
  };

  const handleResetClick = () => {
    if (frames.length === 0) {
      onResetProject();
    } else {
      setShowResetConfirm(true);
    }
  };

  const totalDuration = (frames.length / frameRate).toFixed(1);

  return (
    <div className="w-full max-w-4xl mx-auto py-4 sm:py-6 px-2 sm:px-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-neutral-950 font-bold shadow-lg shadow-amber-500/20">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-['Zen_Maru_Gothic']">
              保存・エクスポート
            </h2>
            <p className="text-xs text-neutral-400">
              作成したストップモーションを動画やZIP画像として書き出します
            </p>
          </div>
        </div>

        {/* Project Summary Card */}
        <div className="bg-neutral-950/80 rounded-xl p-4 border border-neutral-800 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[11px] text-neutral-500 block">総コマ数</span>
              <span className="text-xl font-mono font-bold text-amber-400">
                {frames.length} <span className="text-xs text-neutral-400">コマ</span>
              </span>
            </div>
            <div className="w-px h-8 bg-neutral-800"></div>
            <div>
              <span className="text-[11px] text-neutral-500 block">フレームレート</span>
              <span className="text-xl font-mono font-bold text-white">
                {frameRate} <span className="text-xs text-neutral-400">FPS</span>
              </span>
            </div>
            <div className="w-px h-8 bg-neutral-800"></div>
            <div>
              <span className="text-[11px] text-neutral-500 block">完成再生時間</span>
              <span className="text-xl font-mono font-bold text-emerald-400">
                {totalDuration} <span className="text-xs text-neutral-400">秒</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>解像度: 720 × 480 統一</span>
          </div>
        </div>

        {/* Progress Bar (Visible while exporting) */}
        {progress && (
          <div className="bg-neutral-800/90 border border-neutral-700 rounded-xl p-4 mb-6 animate-pulse">
            <div className="flex items-center justify-between text-xs text-neutral-200 mb-2">
              <span className="flex items-center gap-2 font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                {progress.status}
              </span>
              <span className="font-mono font-bold text-amber-400">{progress.percentage}%</span>
            </div>
            <div className="w-full bg-neutral-700 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-200"
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-xl p-4 mb-6 flex items-center gap-3 text-emerald-300 text-xs">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-950/60 border border-rose-800/80 rounded-xl p-4 mb-6 flex items-center gap-3 text-rose-300 text-xs">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Export Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Card 1: Video File Export */}
          <div className="bg-neutral-850/80 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 flex flex-col justify-between transition-colors">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <Film className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white mb-1">動画ファイルとして書き出し</h3>
              <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
                全コマをパラパラ動画として1つの動画（WebM / MP4形式）に結合してダウンロードします。
              </p>
            </div>
            <button
              id="btn-export-video"
              onClick={handleExportVideo}
              disabled={frames.length === 0 || isExportingVideo || isExportingZip}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isExportingVideo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>動画を生成中...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>動画を書き出す (720x480, {frameRate}fps)</span>
                </>
              )}
            </button>
          </div>

          {/* Card 2: ZIP Package Export */}
          <div className="bg-neutral-850/80 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 flex flex-col justify-between transition-colors">
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-3">
                <FolderArchive className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white mb-1">全コマ画像の一括書き出し (ZIP)</h3>
              <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
                各コマの静止画（JPEG形式, 720×480）をすべてZIP圧縮ファイルにまとめて保存します。
              </p>
            </div>
            <button
              id="btn-export-zip"
              onClick={handleExportZip}
              disabled={frames.length === 0 || isExportingVideo || isExportingZip}
              className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-neutral-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isExportingZip ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                  <span>ZIPを圧縮中...</span>
                </>
              ) : (
                <>
                  <FolderArchive className="w-4 h-4 text-sky-400" />
                  <span>全コマをZIPでダウンロード</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Video Preview Player if generated */}
        {exportedVideoUrl && (
          <div className="mb-8 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                生成された動画プレビュー
              </span>
              <a
                href={exportedVideoUrl}
                download={exportedVideoFilename}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1"
              >
                再ダウンロード
              </a>
            </div>
            <video
              src={exportedVideoUrl}
              controls
              autoPlay
              loop
              className="w-full max-w-md mx-auto aspect-[3/2] rounded-lg bg-black border border-neutral-800 shadow"
            />
          </div>
        )}

        {/* Project Reset Section */}
        <div className="border-t border-neutral-800 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-neutral-200">新規プロジェクトの開始 / リセット</h4>
            <p className="text-xs text-neutral-400">
              ブラウザに保存されたすべてのコマ画像データを削除して、最初から作り直します。
            </p>
          </div>

          <button
            id="btn-reset-project"
            onClick={handleResetClick}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-rose-950/60 text-neutral-300 hover:text-rose-400 border border-neutral-700 hover:border-rose-800/80 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>プロジェクトを初期化する</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="プロジェクトを初期化しますか？"
        message="現在のプロジェクトのすべてのコマ画像と保存データを完全に消去して、新しいプロジェクトを開始します。\n（必要な画像は事前に動画やZIPで書き出しておいてください）"
        confirmLabel="はい、すべて初期化する"
        cancelLabel="キャンセル"
        isDestructive={true}
        onConfirm={() => {
          setShowResetConfirm(false);
          onResetProject();
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};
