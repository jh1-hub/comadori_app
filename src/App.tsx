import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Viewfinder } from './components/Viewfinder';
import { TimelineFilmstrip } from './components/TimelineFilmstrip';
import { EditView } from './components/EditView';
import { PlaybackView } from './components/PlaybackView';
import { ExportView } from './components/ExportView';
import { ResumeDialog } from './components/ResumeDialog';
import { FrameDetailModal } from './components/FrameDetailModal';
import { HelpGuideModal } from './components/HelpGuideModal';
import { ConfirmModal } from './components/ConfirmModal';
import { FrameItem, TabType } from './types';
import {
  loadSavedFrames,
  loadProjectMeta,
  saveSingleFrame,
  deleteLastFrame,
  deleteMultipleStoredFrames,
  updateFramesOrdering,
  clearAllProjectData,
  saveProjectMeta,
} from './services/db';
import { processUploadedImage } from './services/imageProcessing';
import { soundManager } from './services/audio';

const MAX_FRAMES = 200;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('camera');
  const [frames, setFrames] = useState<FrameItem[]>([]);
  const [frameRate, setFrameRate] = useState<number>(4);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Resume dialog state (Requirement 2.6)
  const [showResumeDialog, setShowResumeDialog] = useState<boolean>(false);
  const [pendingRestoredFrames, setPendingRestoredFrames] = useState<FrameItem[]>([]);

  // Frame detail modal for preview
  const [previewFrame, setPreviewFrame] = useState<FrameItem | null>(null);

  // Confirmation Modals for deletion
  const [frameToDelete, setFrameToDelete] = useState<FrameItem | null>(null);
  const [batchDeleteIds, setBatchDeleteIds] = useState<number[] | null>(null);

  // Help modal
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Show a toast message
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2500);
  };

  // Check saved frames on initial mount
  useEffect(() => {
    async function checkSavedData() {
      try {
        const savedMeta = await loadProjectMeta();
        if (savedMeta && savedMeta.frameRate) {
          setFrameRate(savedMeta.frameRate);
        }

        const savedFrames = await loadSavedFrames();
        if (savedFrames && savedFrames.length > 0) {
          setPendingRestoredFrames(savedFrames);
          setShowResumeDialog(true);
        }
      } catch (err) {
        console.error('Error loading saved data:', err);
      }
    }
    checkSavedData();
  }, []);

  // Confirm resume from previous session
  const handleConfirmResume = () => {
    setFrames(pendingRestoredFrames);
    setShowResumeDialog(false);
    showToast(`${pendingRestoredFrames.length} コマの続きから再開しました`);
  };

  // Decline resume and start fresh
  const handleConfirmStartFresh = async () => {
    // Revoke pending URLs
    pendingRestoredFrames.forEach((f) => URL.revokeObjectURL(f.url));
    setPendingRestoredFrames([]);
    setShowResumeDialog(false);
    await clearAllProjectData();
    setFrames([]);
    showToast('新規プロジェクトを開始しました');
  };

  // Handler: Save newly captured camera frame
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
        blob: blob,
        url: URL.createObjectURL(blob),
        createdAt: Date.now(),
      };

      setFrames((prev) => [...prev, newItem]);
    } catch (err) {
      console.error('Failed to save captured frame:', err);
      showToast('コマの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Delete last frame
  const handleDeleteLastFrame = async () => {
    if (frames.length === 0) return;
    try {
      setIsSaving(true);
      const lastIndex = frames.length - 1;
      const lastItem = frames[lastIndex];

      await deleteLastFrame(lastIndex);
      URL.revokeObjectURL(lastItem.url);

      setFrames((prev) => prev.slice(0, -1));
      showToast(`最後のコマ #${lastIndex + 1} を削除しました`);
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
      showToast('タイムラインの並べ替えを保存しました');
    } catch (err) {
      console.error('Reorder update failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Execute deletion of specific IDs
  const executeDeleteFrames = async (ids: number[]) => {
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

      // Close preview if the currently previewed frame was deleted
      if (previewFrame && idSet.has(previewFrame.id)) {
        setPreviewFrame(null);
      }

      showToast(`${ids.length} コマを削除しました`);
    } catch (err) {
      console.error('Delete frames failed:', err);
      showToast('コマの削除に失敗しました');
    } finally {
      setIsSaving(false);
      setFrameToDelete(null);
      setBatchDeleteIds(null);
    }
  };

  // Request deletion for single frame
  const handleRequestDeleteSingle = (frame: FrameItem) => {
    setFrameToDelete(frame);
  };

  // Request deletion for batch
  const handleRequestDeleteBatch = (ids: number[]) => {
    if (ids.length === 0) return;
    setBatchDeleteIds(ids);
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
              onDeleteFrame={(id) => {
                const target = frames.find((f) => f.id === id);
                if (target) handleRequestDeleteSingle(target);
              }}
              onSelectFramePreview={(frame) => setPreviewFrame(frame)}
            />
          </div>
        )}

        {/* Tab 2: Edit & Reorder View */}
        {activeTab === 'edit' && (
          <EditView
            frames={frames}
            frameRate={frameRate}
            onReorder={handleReorder}
            onDeleteMultiple={handleRequestDeleteBatch}
            onDuplicateFrame={handleDuplicateFrame}
            onUploadImage={handleUploadImage}
            onOpenPlayback={() => setActiveTab('playback')}
            onRequestDeleteSingle={handleRequestDeleteSingle}
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

      {/* Single Frame Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={frameToDelete !== null}
        title={`コマ #${frameToDelete ? frameToDelete.order + 1 : ''} を削除しますか？`}
        message="このコマを削除すると、後続のコマの順番が自動で1つずつ繰り上がります。"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        isDestructive={true}
        onConfirm={() => {
          if (frameToDelete) {
            executeDeleteFrames([frameToDelete.id]);
          }
        }}
        onCancel={() => setFrameToDelete(null)}
      />

      {/* Batch Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={batchDeleteIds !== null && batchDeleteIds.length > 0}
        title={`選択した ${batchDeleteIds ? batchDeleteIds.length : 0} コマを削除しますか？`}
        message="選択されたすべてのコマが削除され、残りのコマの順番が自動で再整列されます。"
        confirmLabel="まとめて削除する"
        cancelLabel="キャンセル"
        isDestructive={true}
        onConfirm={() => {
          if (batchDeleteIds) {
            executeDeleteFrames(batchDeleteIds);
          }
        }}
        onCancel={() => setBatchDeleteIds(null)}
      />

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
          onDelete={(id) => {
            const target = frames.find((f) => f.id === id);
            if (target) {
              setPreviewFrame(null);
              handleRequestDeleteSingle(target);
            }
          }}
          onDuplicate={(frame) => handleDuplicateFrame(frame)}
        />
      )}

      {/* Help Guide Modal */}
      <HelpGuideModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
