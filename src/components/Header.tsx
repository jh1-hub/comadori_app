import React from 'react';
import { Camera, Film, Play, Download, Volume2, VolumeX, HelpCircle, CheckCircle2 } from 'lucide-react';
import { ActiveTab } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  frameCount: number;
  maxFrames: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenHelp: () => void;
  isSaving: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  frameCount,
  maxFrames,
  soundEnabled,
  onToggleSound,
  onOpenHelp,
  isSaving,
}) => {
  const isNearLimit = frameCount >= maxFrames * 0.9;
  const isAtLimit = frameCount >= maxFrames;

  return (
    <header className="bg-neutral-900/90 backdrop-blur border-b border-neutral-800 sticky top-0 z-30 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* App Branding */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg text-white font-['Zen_Maru_Gothic'] tracking-wide">
                コマ撮りスタジオ
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {isSaving ? '保存中...' : '自動保存済'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 hidden sm:block">
              ブラウザ完結・ストップモーション作成
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center bg-neutral-800/80 p-1 rounded-xl border border-neutral-700/60 text-xs sm:text-sm font-medium">
          <button
            id="nav-tab-camera"
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'camera'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-700/50'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>撮影</span>
          </button>

          <button
            id="nav-tab-edit"
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'edit'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-700/50'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>コマ編集</span>
            {frameCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'edit' ? 'bg-neutral-950 text-amber-400 font-bold' : 'bg-neutral-700 text-neutral-300'
              }`}>
                {frameCount}
              </span>
            )}
          </button>

          <button
            id="nav-tab-playback"
            onClick={() => setActiveTab('playback')}
            disabled={frameCount === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'playback'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                : frameCount === 0
                ? 'text-neutral-600 cursor-not-allowed'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-700/50'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>再生</span>
          </button>

          <button
            id="nav-tab-export"
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'export'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-700/50'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>書出</span>
          </button>
        </nav>

        {/* Frame Counter & Quick Controls */}
        <div className="flex items-center gap-2">
          <div
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
              isAtLimit
                ? 'bg-rose-950/50 text-rose-300 border-rose-700/60'
                : isNearLimit
                ? 'bg-amber-950/50 text-amber-300 border-amber-700/60'
                : 'bg-neutral-800/80 text-neutral-200 border-neutral-700/60'
            }`}
            title="撮影済みコマ数 / 最大撮影枚数"
          >
            <span className="text-amber-400 font-mono font-bold text-sm">{frameCount}</span>
            <span className="text-neutral-500">/</span>
            <span className="text-neutral-400 font-mono">{maxFrames}</span>
            <span className="hidden sm:inline text-[11px] text-neutral-400">コマ</span>
          </div>

          <button
            id="btn-sound-toggle"
            onClick={onToggleSound}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors"
            title={soundEnabled ? '効果音: ON (クリックでOFF)' : '効果音: OFF (クリックでON)'}
            aria-label="効果音切り替え"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
          </button>

          <button
            id="btn-help-guide"
            onClick={onOpenHelp}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors"
            title="使い方ガイド"
            aria-label="使い方ガイド"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
