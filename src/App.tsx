import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActiveTab, FrameItem } from './types';
import {
  getAllStoredFrames,
  saveSingleFrame,
  deleteSingleFrame,
  deleteMultipleStoredFrames,
  updateFramesOrdering,
  clearAllProjectData,
  loadProjectMeta,
  saveProjectMeta,
  StoredFrameRecord,
} from './services/db';
import { processUploadedImage } from './services/imageProcessing';
import { soundManager } from './services/audio';
import { Header } from './components/Header';
import { Viewfinder } from './components/Viewfinder';
import { TimelineFilmstrip } from './components/TimelineFilmstrip';
import { EditView } from './components/EditView';
import { PlaybackView } from './components/PlaybackView';
import { ExportView } from './components/ExportView';
import { ResumeDialog } from './components/ResumeDialog';
import { HelpGuideModal } from './components/HelpGuideModal';
import { FrameDetailModal } from './components/FrameDetailModal';

const MAX_FRAMES = 200;

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('camera');
  const [frames, setFrames] = useState<FrameItem[]>([]);
  const [frameRate, setFrameRate] = useState<number>(8);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Resume dialog state for Requirement 2.6
  const [showResumeDialog, setShowResumeDialog] = useState<boolean>(false);
  const [pendingRestoredFrames, setPendingRestoredFrames] = useState<FrameItem[]>([]);

  // Selected frame detail modal
  const [previewFrame, setPreviewFrame] = useState<FrameItem | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // Helper to convert DB records to FrameItem with Object URLs
  const convertRecordsToItems = (records: StoredFrameRecord[]): FrameItem[] => {
    return records.map((rec) => ({
      id: rec.id || 0,
      order: rec.order,
      blob: rec.image,
      url: URL.createObjectURL(rec.image),
      createdAt: rec.createdAt,
    }));
  };

  // Initial load: check IndexedDB
  useEffect(() => {
    async function initFromDB() {
      try {
        const [records, meta] = await Promise.all([
          getAllStoredFrames(),
          loadProjectMeta(),
        ]);

        if (meta && meta.frameRate) {
          setFrameRate(meta.frameRate);
        }

        if (records.length > 0) {
          const items = convertRecordsToItems(records);
          setPendingRestoredFrames(items);
          setShowResumeDialog(true);
        }
      } catch (err) {
        console.error('Failed to initialize from IndexedDB:', err);
      }
    }
    initFromDB();
  }, []);

  // Handler: Resume previous project
  const handleConfirmResume = () => {
    setFrames(pendingRestoredFrames);
    setShowResumeDialog(false);
    showToast(`前回のプロジェクト (${pendingRestoredFrames.length}コマ) を復元しました`);
  };

  // Handler: Start fresh project
  const handleConfirmStartFresh = async () => {
    // Revoke old URLs
    pendingRestoredFrames.forEach((f) => URL.revokeObjectURL(f.url));
    setPendingRestoredFrames([]);
    await clearAllProjectData();
    setFrames([]);
    setShowResumeDialog(false);
    showToast('新しいプロジェクトを開始しました');
  };

  // Handler: Capture a new frame from camera
  const handleCaptureFrame = async (blob: Blob) => {
    if (frames.length >= MAX_FRAMES) {
      showToast('撮影上限 (200コマ) に達しました');
      return;
    }

    try {
      setIsSaving(true);
      const newOrder = frames.length;
      const newId = await saveSingleFrame(blob, newOrder);
      const newItem: FrameItem = {
        id: newId,
        order: newOrder,
        blob,
        url: URL.createObjectURL(blob),
        createdAt: Date.now(),
      };

      setFrames((prev) => [...prev, newItem]);
      showToast(`コマ #${newOrder + 1} を保存しました`);
    } catch (err) {
      console.error('Failed to save frame to IndexedDB:', err);
      showToast('コマの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Delete last frame
  const handleDeleteLastFrame = async () => {
    if (frames.length === 0) return;
    const lastItem = frames[frames.length - 1];

    try {
      setIsSaving(true);
      await deleteSingleFrame(lastItem.id);
      URL.revokeObjectURL(lastItem.url);
      setFrames((prev) => prev.slice(0, -1));
      showToast('直前のコマを削除しました');
    } catch (err) {
      console.error('Failed to delete last frame:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Upload image file as a frame
  const handleUploadImage = async (file: File) => {
    if (frames.length >= MAX_FRAMES) {
      showToast('撮影上限 (200コマ) に達しました');
      return;
    }

    try {
      setIsSaving(true);
      const processedBlob = await processUploadedImage(file);
      const newOrder = frames.length;
      const newId = await saveSingleFrame(processedBlob, newOrder);
      const newItem: FrameItem = {
        id: newId,
        order: newOrder,
        blob: processedBlob,
        url: URL.createObjectURL(processedBlob),
        createdAt: Date.now(),
      };

      setFrames((prev) => [...prev, newItem]);
      showToast(`画像をコマ #${newOrder + 1} として追加しました`);
    } catch (err) {
      console.error('Image upload failed:', err);
      showToast('画像の読み込み・処理に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Reorder frames
  const handleReorder = async (newOrderedIds: number[]) => {
    try {
      setIsSaving(true);
      await updateFramesOrdering(newOrderedIds);

      // Re-sort local state
      const frameMap = new Map<number, FrameItem>();
      frames.forEach((f) => frameMap.set(f.id, f));
      const newFrames: FrameItem[] = [];
      newOrderedIds.forEach((id, idx) => {
        const item = frameMap.get(id);
        if (item) {
          newFrames.push({
            id: item.id,
            order: idx,
            blob: item.blob,
            url: item.url,
            createdAt: item.createdAt,
          });
        }
      });

      setFrames(newFrames);
      showToast('コマの並べ替えを保存しました');
    } catch (err) {
      console.error('Reorder update failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Batch delete frames
  const handleDeleteMultiple = async (ids: number[]) => {
    try {
      setIsSaving(true);
      await deleteMultipleStoredFrames(ids);

      const idSet = new Set(ids);
      // Clean up object URLs
      frames.forEach((f) => {
        if (idSet.has(f.id)) URL.revokeObjectURL(f.url);
      });

      const remaining = frames
        .filter((f) => !idSet.has(f.id))
        .map((f, idx) => ({ ...f, order: idx }));

      setFrames(remaining);
      showToast(`${ids.length} コマを削除しました`);
    } catch (err) {
      console.error('Delete multiple failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Duplicate a frame
  const handleDuplicateFrame = async (frame: FrameItem) => {
    if (frames.length >= MAX_FRAMES) {
      showToast('撮影上限 (200コマ) に達しました');
      return;
    }

    try {
      setIsSaving(true);
      const newOrder = frames.length;
      const newId = await saveSingleFrame(frame.blob, newOrder);
      const newItem: FrameItem = {
        id: newId,
        order: newOrder,
        blob: frame.blob,
        url: URL.createObjectURL(frame.blob),
        createdAt: Date.now(),
      };

      setFrames((prev) => [...prev, newItem]);
      showToast(`コマ #${frame.order + 1} を複製しました`);
    } catch (err) {
      console.error('Duplicate failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Frame rate update
  const handleFrameRateChange = async (newFps: number) => {
    setFrameRate(newFps);
    await saveProjectMeta({ frameRate: newFps });
  };

  // Handler: Full Project Reset
  const handleResetProject = async () => {
    frames.forEach((f) => URL.revokeObjectURL(f.url));
    await clearAllProjectData();
    setFrames([]);
    setActiveTab('camera');
    showToast('プロジェクトをリセットしました');
  };

  // Sound toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.setEnabled(next);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        frameCount={frames.length}
        maxFrames={MAX_FRAMES}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onOpenHelp={() => setIsHelpOpen(true)}
        isSaving={isSaving}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 flex flex-col items-center">
        {/* Tab 1: Camera Shooting View */}
        {activeTab === 'camera' && (
          <div className="w-full flex flex-col items-center">
            <Viewfinder
              frames={frames}
              onCaptureFrame={handleCaptureFrame}
              onDeleteLastFrame={handleDeleteLastFrame}
              maxFrames={MAX_FRAMES}
            />

            <TimelineFilmstrip
              frames={frames}
              onUploadImage={handleUploadImage}
              onOpenEditTab={() => setActiveTab('edit')}
              onDeleteFrame={(id) => handleDeleteMultiple([id])}
              onSelectFramePreview={(frame) => setPreviewFrame(frame)}
            />
          </div>
        )}

        {/* Tab 2: Edit & Reorder View */}
        {activeTab === 'edit' && (
          <EditView
            frames={frames}
            onReorder={handleReorder}
            onDeleteMultiple={handleDeleteMultiple}
            onDuplicateFrame={handleDuplicateFrame}
            onUploadImage={handleUploadImage}
            onOpenPlayback={() => setActiveTab('playback')}
          />
        )}

        {/* Tab 3: Playback Preview View */}
        {activeTab === 'playback' && (
          <PlaybackView
            frames={frames}
            frameRate={frameRate}
            onFrameRateChange={handleFrameRateChange}
            onOpenExport={() => setActiveTab('export')}
          />
        )}

        {/* Tab 4: Export & Save View */}
        {activeTab === 'export' && (
          <ExportView
            frames={frames}
            frameRate={frameRate}
            onResetProject={handleResetProject}
          />
        )}
      </main>

      {/* Persistent Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-neutral-900/95 backdrop-blur text-white px-4 py-2.5 rounded-2xl border border-neutral-700/80 shadow-2xl text-xs flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Requirement 2.6: Restore confirmation dialog on load */}
      {showResumeDialog && (
        <ResumeDialog
          savedFrames={pendingRestoredFrames}
          onConfirmResume={handleConfirmResume}
          onConfirmStartFresh={handleConfirmStartFresh}
        />
      )}

      {/* Frame Detail modal */}
      {previewFrame && (
        <FrameDetailModal
          frame={previewFrame}
          totalFrames={frames.length}
          onClose={() => setPreviewFrame(null)}
          onDelete={(id) => handleDeleteMultiple([id])}
          onDuplicate={(frame) => handleDuplicateFrame(frame)}
        />
      )}

      {/* Help Guide Modal */}
      <HelpGuideModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
