import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Eye,
  EyeOff,
  Grid,
  Clock,
  Trash2,
  AlertCircle,
  CameraOff,
  Sliders,
  Sparkles,
  SwitchCamera,
  FlipHorizontal,
  ChevronDown,
  Video,
} from 'lucide-react';
import { FrameItem } from '../types';
import { captureVideoFrame } from '../services/imageProcessing';
import { soundManager } from '../services/audio';

interface ViewfinderProps {
  frames: FrameItem[];
  onCaptureFrame: (blob: Blob) => Promise<void>;
  onDeleteLastFrame: () => void;
  maxFrames: number;
}

export const Viewfinder: React.FC<ViewfinderProps> = ({
  frames,
  onCaptureFrame,
  onDeleteLastFrame,
  maxFrames,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [flashActive, setFlashActive] = useState<boolean>(false);

  // Camera device list and active selection
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [showDeviceSelector, setShowDeviceSelector] = useState<boolean>(false);
  const [isMirrored, setIsMirrored] = useState<boolean>(false);

  // Onion skin settings
  const [onionSkinEnabled, setOnionSkinEnabled] = useState<boolean>(true);
  const [onionOpacity, setOnionOpacity] = useState<number>(0.4);
  const [showOnionControls, setShowOnionControls] = useState<boolean>(false);

  // Framing guide
  const [gridEnabled, setGridEnabled] = useState<boolean>(true);

  // Timer mode: 0 (instant) or 3 seconds
  const [timerSeconds, setTimerSeconds] = useState<0 | 3>(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Previous frame for onion skinning
  const previousFrame = frames.length > 0 ? frames[frames.length - 1] : null;
  const isAtLimit = frames.length >= maxFrames;

  // Enumerate cameras
  const refreshCameraDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setCameraDevices(videoInputs);
      return videoInputs;
    } catch (e) {
      console.warn('enumerateDevices error:', e);
      return [];
    }
  }, []);

  // Start camera with specific deviceId or fallback to environment
  const startCamera = useCallback(async (targetDeviceId?: string) => {
    try {
      setCameraError(null);

      // Stop existing tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      let constraints: MediaStreamConstraints;

      if (targetDeviceId) {
        constraints = {
          audio: false,
          video: {
            deviceId: { exact: targetDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };
      } else {
        constraints = {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };
      }

      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Fallback to basic video request if exact deviceId failed
        newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = newStream;

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      // Read active track to determine deviceId & label
      const activeVideoTrack = newStream.getVideoTracks()[0];
      const activeSettings = activeVideoTrack?.getSettings();
      const currentId = activeSettings?.deviceId || targetDeviceId || '';
      setSelectedDeviceId(currentId);

      // Refresh camera list with actual labels (after permission granted)
      const list = await refreshCameraDevices();
      if (list && list.length > 0 && !targetDeviceId) {
        const found = list.find((d) => d.deviceId === currentId);
        if (found) {
          // Check if front camera to set initial mirror state sensibly
          const labelLower = found.label.toLowerCase();
          const isFront =
            labelLower.includes('front') ||
            labelLower.includes('user') ||
            labelLower.includes('内') ||
            labelLower.includes('イン');
          setIsMirrored(isFront);
        }
      }
    } catch (err: unknown) {
      console.error('Camera access failed:', err);
      const msg = err instanceof Error ? err.message : 'カメラを起動できませんでした';
      setCameraError(
        `カメラへのアクセスが拒否されたか、デバイスが見つかりません。ブラウザのカメラ権限設定をご確認ください。(${msg})`
      );
    }
  }, [refreshCameraDevices]);

  // Initial camera startup
  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Switch to next camera in the list
  const handleCycleCamera = () => {
    if (cameraDevices.length <= 1) {
      // If only 1 device found or not enumerated, toggle mirror or retry
      setIsMirrored((prev) => !prev);
      return;
    }

    const currentIndex = cameraDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % cameraDevices.length;
    const nextDevice = cameraDevices[nextIndex];

    setSelectedDeviceId(nextDevice.deviceId);

    // Auto-detect mirror for front cameras
    const labelLower = nextDevice.label.toLowerCase();
    const isFront =
      labelLower.includes('front') ||
      labelLower.includes('user') ||
      labelLower.includes('内') ||
      labelLower.includes('イン');
    setIsMirrored(isFront);

    startCamera(nextDevice.deviceId);
  };

  // Direct selection of a camera
  const handleSelectCameraDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setShowDeviceSelector(false);

    const dev = cameraDevices.find((d) => d.deviceId === deviceId);
    if (dev) {
      const labelLower = dev.label.toLowerCase();
      const isFront =
        labelLower.includes('front') ||
        labelLower.includes('user') ||
        labelLower.includes('内') ||
        labelLower.includes('イン');
      setIsMirrored(isFront);
    }

    startCamera(deviceId);
  };

  // Perform actual frame capture
  const executeCapture = async () => {
    if (!videoRef.current || isCapturing || isAtLimit) return;

    try {
      setIsCapturing(true);
      setFlashActive(true);
      soundManager.playShutter();

      setTimeout(() => setFlashActive(false), 200);

      const blob = await captureVideoFrame(videoRef.current);
      await onCaptureFrame(blob);
    } catch (err) {
      console.error('Frame capture failed:', err);
    } finally {
      setIsCapturing(false);
      setCountdown(null);
    }
  };

  // Trigger capture with optional countdown timer
  const handleTriggerCapture = () => {
    if (isCapturing || isAtLimit) return;

    if (timerSeconds === 0) {
      executeCapture();
    } else {
      let count = timerSeconds;
      setCountdown(count);
      soundManager.playBeep(false);

      const interval = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdown(count);
          soundManager.playBeep(false);
        } else {
          clearInterval(interval);
          setCountdown(null);
          soundManager.playBeep(true);
          executeCapture();
        }
      }, 1000);
    }
  };

  // Keyboard shortcut: Spacebar captures frame
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        handleTriggerCapture();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCapturing, isAtLimit, timerSeconds]);

  const currentCameraDevice = cameraDevices.find((d) => d.deviceId === selectedDeviceId);
  const currentCameraName =
    currentCameraDevice?.label ||
    (cameraDevices.length > 0 ? `カメラ ${cameraDevices.findIndex((d) => d.deviceId === selectedDeviceId) + 1}` : 'カメラ起動中');

  return (
    <div className="w-full flex flex-col items-center">
      {/* Viewfinder Main Stage */}
      <div className="w-full max-w-4xl relative">
        {/* 720:480 (3:2) Aspect Ratio Container */}
        <div
          id="camera-viewfinder-container"
          className="relative w-full aspect-[3/2] bg-neutral-950 rounded-2xl overflow-hidden border-2 border-neutral-800 shadow-2xl shadow-black/80 flex items-center justify-center select-none"
        >
          {/* Live Camera Video Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${
              isMirrored ? 'scale-x-[-1]' : ''
            }`}
          />

          {/* Onion Skin Overlay (半透明重ね表示) */}
          {onionSkinEnabled && previousFrame && (
            <div
              id="onion-skin-overlay"
              className="absolute inset-0 pointer-events-none transition-opacity duration-150"
              style={{ opacity: onionOpacity }}
            >
              <img
                src={previousFrame.url}
                alt={`直前のコマ #${previousFrame.order + 1}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {/* Rule of Thirds 3x3 Grid Overlay */}
          {gridEnabled && (
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-10">
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div></div>
            </div>
          )}

          {/* Shutter Flash Animation */}
          {flashActive && (
            <div className="absolute inset-0 bg-white z-20 animate-fade-out pointer-events-none" />
          )}

          {/* Countdown Timer Display */}
          {countdown !== null && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-20">
              <div className="w-24 h-24 rounded-full bg-amber-500/90 text-neutral-950 flex items-center justify-center font-bold text-5xl font-mono shadow-2xl animate-pulse">
                {countdown}
              </div>
            </div>
          )}

          {/* Camera Error / Permission Fallback */}
          {cameraError && (
            <div className="absolute inset-0 bg-neutral-900/95 flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400 mb-3">
                <CameraOff className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-base text-white mb-1">カメラにアクセスできません</h3>
              <p className="text-xs text-neutral-400 max-w-md mb-4 leading-relaxed">
                {cameraError}
              </p>
              <button
                onClick={() => startCamera(selectedDeviceId)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>カメラを再起動する</span>
              </button>
            </div>
          )}

          {/* Viewfinder Info Overlay Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-mono text-neutral-300 border border-white/10 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                720 × 480
              </span>

              {onionSkinEnabled && (
                <span className="bg-amber-500/20 backdrop-blur-md px-2 py-1 rounded-md text-[11px] font-medium text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  オニオンスキン: {previousFrame ? `${Math.round(onionOpacity * 100)}%` : '前のコマ待機中'}
                </span>
              )}
            </div>

            {/* Warning if nearing limit */}
            {isAtLimit && (
              <span className="bg-rose-500/90 text-white px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-lg">
                <AlertCircle className="w-3.5 h-3.5" />
                上限200枚に達しました
              </span>
            )}
          </div>
        </div>

        {/* Viewfinder Controls Toolbar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
          {/* Left Controls: Onion Skin, Grid, Timer */}
          <div className="flex items-center gap-2">
            {/* Onion Skin Toggle */}
            <div className="relative">
              <div className="flex items-center bg-neutral-800 rounded-xl border border-neutral-700/80 p-0.5">
                <button
                  id="btn-onion-toggle"
                  onClick={() => setOnionSkinEnabled((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    onionSkinEnabled
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="オニオンスキン (前コマ半透明表示) の切替"
                >
                  {onionSkinEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>オニオンスキン</span>
                </button>

                {onionSkinEnabled && (
                  <button
                    onClick={() => setShowOnionControls((prev) => !prev)}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      showOnionControls ? 'bg-neutral-700 text-amber-400' : 'text-neutral-400 hover:text-white'
                    }`}
                    title="透明度を調整"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Onion Opacity Popover */}
              {showOnionControls && onionSkinEnabled && (
                <div className="absolute left-0 top-full mt-2 w-56 p-3 bg-neutral-800/95 backdrop-blur-md rounded-xl border border-neutral-700 shadow-xl z-30">
                  <div className="flex items-center justify-between text-xs text-neutral-300 mb-2">
                    <span>重ねる透明度</span>
                    <span className="font-mono font-bold text-amber-400">
                      {Math.round(onionOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={onionOpacity}
                    onChange={(e) => setOnionOpacity(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                    <span>薄い (10%)</span>
                    <span>標準 (40%)</span>
                    <span>濃い (90%)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Grid Toggle */}
            <button
              id="btn-grid-toggle"
              onClick={() => setGridEnabled((prev) => !prev)}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-colors ${
                gridEnabled
                  ? 'bg-neutral-800 text-amber-400 border-amber-500/40'
                  : 'bg-neutral-800/60 text-neutral-400 border-neutral-700/60 hover:text-white'
              }`}
              title="構図グリッド (3分割線) の表示/非表示"
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">グリッド</span>
            </button>

            {/* Timer Toggle */}
            <button
              id="btn-timer-toggle"
              onClick={() => setTimerSeconds((prev) => (prev === 0 ? 3 : 0))}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-colors ${
                timerSeconds > 0
                  ? 'bg-neutral-800 text-amber-400 border-amber-500/40 font-bold'
                  : 'bg-neutral-800/60 text-neutral-400 border-neutral-700/60 hover:text-white'
              }`}
              title="撮影タイマー (手が写り込まないよう3秒後にシャッター)"
            >
              <Clock className="w-4 h-4" />
              <span>{timerSeconds === 0 ? '即時' : '3秒タイマー'}</span>
            </button>
          </div>

          {/* Right Controls: Real Camera Selection & Mirror Switch */}
          <div className="flex items-center gap-2">
            {/* Mirror Toggle Button */}
            <button
              id="btn-toggle-mirror"
              onClick={() => setIsMirrored((prev) => !prev)}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-colors ${
                isMirrored
                  ? 'bg-neutral-800 text-amber-400 border-amber-500/40'
                  : 'bg-neutral-800/60 text-neutral-400 border-neutral-700/60 hover:text-white'
              }`}
              title={isMirrored ? '左右反転中 (クリックで通常表示)' : '通常表示 (クリックで左右反転)'}
            >
              <FlipHorizontal className="w-4 h-4" />
              <span className="hidden md:inline">{isMirrored ? '反転ON' : '反転OFF'}</span>
            </button>

            {/* Camera Switcher Cycle Button */}
            <button
              id="btn-camera-cycle"
              onClick={handleCycleCamera}
              className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="カメラを切り替える (別のカメラデバイスへ変更)"
            >
              <SwitchCamera className="w-4 h-4 text-amber-400" />
              <span>カメラ切替</span>
              {cameraDevices.length > 1 && (
                <span className="text-[10px] bg-amber-400 text-neutral-950 font-bold px-1 rounded-full">
                  {cameraDevices.length}
                </span>
              )}
            </button>

            {/* Camera Device Dropdown Selector */}
            {cameraDevices.length > 1 && (
              <div className="relative">
                <button
                  id="btn-camera-select-dropdown"
                  onClick={() => setShowDeviceSelector((prev) => !prev)}
                  className="px-2.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs flex items-center gap-1.5 transition-colors max-w-[160px] truncate"
                  title="カメラを選択"
                >
                  <Video className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                  <span className="truncate">{currentCameraName}</span>
                  <ChevronDown className="w-3 h-3 flex-shrink-0" />
                </button>

                {showDeviceSelector && (
                  <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-neutral-900/95 backdrop-blur-md rounded-2xl border border-neutral-700 shadow-2xl z-40">
                    <div className="text-[11px] font-bold text-neutral-400 px-2 py-1 border-b border-neutral-800 mb-1">
                      利用可能なカメラデバイス
                    </div>
                    <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
                      {cameraDevices.map((device, idx) => {
                        const isSelected = device.deviceId === selectedDeviceId;
                        const label = device.label || `カメラ ${idx + 1}`;
                        return (
                          <button
                            key={device.deviceId || idx}
                            onClick={() => handleSelectCameraDevice(device.deviceId)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-amber-500 text-neutral-950 font-bold'
                                : 'text-neutral-300 hover:bg-neutral-800'
                            }`}
                          >
                            <span className="truncate">{label}</span>
                            {isSelected && <span className="text-[10px] font-mono">使用中</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Primary Shutter & Immediate Action Bar */}
        <div className="mt-5 flex items-center justify-center gap-6 sm:gap-10">
          {/* Quick Delete Last Frame Button */}
          <div className="w-24 flex justify-end">
            <button
              id="btn-delete-last-frame"
              onClick={onDeleteLastFrame}
              disabled={frames.length === 0}
              className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all ${
                frames.length > 0
                  ? 'bg-neutral-800 hover:bg-rose-950/40 text-neutral-300 hover:text-rose-400 border-neutral-700 hover:border-rose-700/50 cursor-pointer active:scale-95'
                  : 'bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed'
              }`}
              title="直前のコマを1枚削除"
            >
              <Trash2 className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium whitespace-nowrap">最後のコマ削除</span>
            </button>
          </div>

          {/* Shutter Button */}
          <div className="relative flex flex-col items-center">
            <button
              id="btn-shutter"
              onClick={handleTriggerCapture}
              disabled={isCapturing || isAtLimit}
              className={`group relative w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1.5 border-4 transition-transform active:scale-95 shadow-xl flex items-center justify-center ${
                isAtLimit
                  ? 'border-neutral-700 bg-neutral-800 opacity-50 cursor-not-allowed'
                  : 'border-amber-400/80 bg-neutral-950 hover:border-amber-300 shadow-amber-500/20 cursor-pointer'
              }`}
              aria-label="シャッターを切る (1コマ撮影)"
            >
              {/* Inner shutter circle */}
              <div
                className={`w-full h-full rounded-full flex items-center justify-center transition-all ${
                  isAtLimit
                    ? 'bg-neutral-700'
                    : isCapturing
                    ? 'bg-amber-600 scale-90'
                    : 'bg-gradient-to-tr from-amber-500 to-orange-500 group-hover:from-amber-400 group-hover:to-orange-400 shadow-inner'
                }`}
              >
                <Camera className="w-8 h-8 text-neutral-950" />
              </div>
            </button>
            <span className="text-[11px] font-medium text-neutral-400 mt-2">
              スペースキーでも撮影可能
            </span>
          </div>

          {/* Frame count placeholder / status indicator */}
          <div className="w-24 flex justify-start">
            <div className="text-center bg-neutral-800/80 border border-neutral-700/60 rounded-2xl p-2.5 w-full">
              <span className="text-[10px] text-neutral-400 block">撮影済</span>
              <span className="text-lg font-bold font-mono text-amber-400">
                {frames.length}
              </span>
              <span className="text-[10px] text-neutral-500 block">/ {maxFrames}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
