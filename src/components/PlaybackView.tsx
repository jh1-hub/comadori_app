import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Film,
  Download,
} from 'lucide-react';
import { FrameItem } from '../types';

interface PlaybackViewProps {
  frames: FrameItem[];
  frameRate: number;
  onFrameRateChange: (newFps: number) => void;
  onOpenExport: () => void;
}

export const PlaybackView: React.FC<PlaybackViewProps> = ({
  frames,
  frameRate,
  onFrameRateChange,
  onOpenExport,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isLoop, setIsLoop] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Playback loop interval
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;

    const intervalTime = 1000 / frameRate;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= frames.length - 1) {
          if (isLoop) {
            return 0;
          } else {
            setIsPlaying(false);
            return prev;
          }
        }
        return prev + 1;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPlaying, frameRate, isLoop, frames.length]);

  // Handle keyboard shortcuts (Space to toggle play/pause, left/right arrows to step)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : frames.length - 1));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentIndex((prev) => (prev < frames.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [frames.length]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (frames.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 text-center text-neutral-400">
        <Film className="w-12 h-12 mx-auto mb-3 text-neutral-600" />
        <p className="text-sm">再生するコマがまだありません。「撮影」画面から撮影してください。</p>
      </div>
    );
  }

  const currentFrame = frames[currentIndex] || frames[0];
  const totalSeconds = (frames.length / frameRate).toFixed(1);
  const currentSeconds = ((currentIndex + 1) / frameRate).toFixed(1);

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-4xl mx-auto flex flex-col items-center py-2 sm:py-4 px-2 sm:px-4 ${
        isFullscreen ? 'h-screen bg-black justify-center p-6' : ''
      }`}
    >
      {/* Player Screen (720:480 / 3:2 Aspect Ratio) */}
      <div className="relative w-full aspect-[3/2] bg-neutral-950 rounded-2xl overflow-hidden border-2 border-neutral-800 shadow-2xl shadow-black/80 flex items-center justify-center select-none group">
        <img
          src={currentFrame.url}
          alt={`コマ #${currentIndex + 1}`}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />

        {/* Top Floating Stats */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-2">
            <span className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-mono font-bold text-white border border-white/10">
              コマ: {currentIndex + 1} / {frames.length}
            </span>
            <span className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-mono text-amber-400 border border-white/10">
              {currentSeconds}s / {totalSeconds}s
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="pointer-events-auto p-2 rounded-lg bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-colors"
            title="フルスクリーン切り替え"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Large Play Indicator Overlay (When paused) */}
        {!isPlaying && (
          <div
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-amber-500/90 text-neutral-950 flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Scrubber Timeline Bar */}
      <div className="w-full mt-4 px-1">
        <input
          type="range"
          min="0"
          max={frames.length - 1}
          value={currentIndex}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentIndex(parseInt(e.target.value, 10));
          }}
          className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400"
        />
      </div>

      {/* Player Controls Bar */}
      <div className="w-full mt-3 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        {/* Playback step buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Jump to Start */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentIndex(0);
            }}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors"
            title="最初のコマへ"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Step Back 1 Frame */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentIndex((prev) => (prev > 0 ? prev - 1 : frames.length - 1));
            }}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors"
            title="1コマ戻る (◀キー)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Play / Pause Primary Button */}
          <button
            id="btn-player-play-toggle"
            onClick={() => setIsPlaying((prev) => !prev)}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all active:scale-95"
            title="再生 / 一時停止 (スペースキー)"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>一時停止</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>再生する</span>
              </>
            )}
          </button>

          {/* Step Forward 1 Frame */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentIndex((prev) => (prev < frames.length - 1 ? prev + 1 : 0));
            }}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors"
            title="1コマ進む (▶キー)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Jump to End */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentIndex(frames.length - 1);
            }}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors"
            title="最後のコマへ"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Loop toggle */}
          <button
            onClick={() => setIsLoop((prev) => !prev)}
            className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isLoop
                ? 'bg-neutral-800 text-amber-400 border-amber-500/40'
                : 'bg-neutral-800/60 text-neutral-500 border-neutral-700'
            }`}
            title="ループ再生の切替"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ループ {isLoop ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Frame Rate (FPS) Slider */}
        <div className="flex items-center gap-3 bg-neutral-800/80 px-3 py-2 rounded-xl border border-neutral-700/60">
          <div className="text-xs">
            <span className="text-neutral-400 block text-[10px]">フレームレート</span>
            <span className="font-mono font-bold text-amber-400">{frameRate} FPS</span>
          </div>
          <input
            type="range"
            min="1"
            max="24"
            step="1"
            value={frameRate}
            onChange={(e) => onFrameRateChange(parseInt(e.target.value, 10))}
            className="w-24 sm:w-32 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex gap-1">
            {[4, 8, 12, 24].map((preset) => (
              <button
                key={preset}
                onClick={() => onFrameRateChange(preset)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  frameRate === preset
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'bg-neutral-700 text-neutral-300 hover:text-white'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Export Button */}
        <div>
          <button
            onClick={onOpenExport}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>動画を書き出す</span>
          </button>
        </div>
      </div>
    </div>
  );
};
