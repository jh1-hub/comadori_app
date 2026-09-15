import React, { useState, useEffect } from 'react';
import { GraduationCap, Download, X, FileVideo, FolderArchive, RotateCcw } from 'lucide-react';

export interface StudentInfo {
  grade: string;
  classRoom: string;
  number: string;
  name: string;
}

interface StudentInfoExportModalProps {
  isOpen: boolean;
  exportType: 'video' | 'zip';
  extension: string;
  onConfirmWithInfo: (prefix: string) => void;
  onConfirmWithoutInfo: () => void;
  onCancel: () => void;
}

const STORAGE_KEY = 'komadori_student_info_saved';

export function buildStudentPrefix(info: StudentInfo): string {
  const cleanGrade = info.grade.trim();
  const cleanClass = info.classRoom.trim();
  const cleanNum = info.number.trim();
  const cleanName = info.name.trim();

  let classPart = '';
  if (cleanGrade) {
    classPart += cleanGrade.endsWith('年') ? cleanGrade : `${cleanGrade}年`;
  }
  if (cleanClass) {
    classPart += cleanClass.endsWith('組') ? cleanClass : `${cleanClass}組`;
  }
  if (cleanNum) {
    classPart += cleanNum.endsWith('番') ? cleanNum : `${cleanNum}番`;
  }

  const parts: string[] = [];
  if (classPart) {
    parts.push(classPart);
  }
  if (cleanName) {
    // Sanitize any invalid filename characters
    const sanitizedName = cleanName.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ');
    parts.push(sanitizedName);
  }

  return parts.join('_');
}

export const StudentInfoExportModal: React.FC<StudentInfoExportModalProps> = ({
  isOpen,
  exportType,
  extension,
  onConfirmWithInfo,
  onConfirmWithoutInfo,
  onCancel,
}) => {
  const [studentInfo, setStudentInfo] = useState<StudentInfo>({
    grade: '',
    classRoom: '',
    number: '',
    name: '',
  });

  // Load saved student info on open
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setStudentInfo({
            grade: parsed.grade || '',
            classRoom: parsed.classRoom || '',
            number: parsed.number || '',
            name: parsed.name || '',
          });
        }
      } catch (e) {
        console.warn('Failed to load student info from localStorage', e);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const prefix = buildStudentPrefix(studentInfo);
  const sampleBase = exportType === 'video' ? 'komadori_20260915_120000' : 'komadori_frames_20260915_120000';
  const previewFilename = prefix ? `${prefix}_${sampleBase}.${extension}` : `${sampleBase}.${extension}`;
  const hasInput = !!(
    studentInfo.grade.trim() ||
    studentInfo.classRoom.trim() ||
    studentInfo.number.trim() ||
    studentInfo.name.trim()
  );

  const handleExportWithInfo = () => {
    // Save to localStorage for convenience
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(studentInfo));
    } catch (e) {
      console.warn('Failed to save student info', e);
    }
    onConfirmWithInfo(prefix);
  };

  const handleClearInfo = () => {
    setStudentInfo({ grade: '', classRoom: '', number: '', name: '' });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-start justify-between gap-3 bg-neutral-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                ファイル名に年・組・番・氏名を入力しますか？
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                学校の提出用などに、ファイル名の先頭にお名前や学年を追加できます。
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form Body */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {/* 年 (学年) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                学年 (年)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={studentInfo.grade}
                  onChange={(e) => setStudentInfo((prev) => ({ ...prev, grade: e.target.value }))}
                  placeholder="例: 3"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-neutral-500 pointer-events-none">
                  年
                </span>
              </div>
            </div>

            {/* 組 (クラス) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                クラス (組)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={studentInfo.classRoom}
                  onChange={(e) => setStudentInfo((prev) => ({ ...prev, classRoom: e.target.value }))}
                  placeholder="例: 2"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-neutral-500 pointer-events-none">
                  組
                </span>
              </div>
            </div>

            {/* 番 (出席番号) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                出席番号 (番)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={studentInfo.number}
                  onChange={(e) => setStudentInfo((prev) => ({ ...prev, number: e.target.value }))}
                  placeholder="例: 15"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-neutral-500 pointer-events-none">
                  番
                </span>
              </div>
            </div>
          </div>

          {/* 氏名 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-300">
                氏名 (お名前)
              </label>
              {hasInput && (
                <button
                  type="button"
                  onClick={handleClearInfo}
                  className="text-[11px] text-neutral-400 hover:text-amber-400 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>入力をクリア</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={studentInfo.name}
              onChange={(e) => setStudentInfo((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="例: 山田 太郎"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Filename Preview Box */}
          <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-neutral-400">
                書き出されるファイル名プレビュー
              </span>
              <span className="text-[10px] text-amber-400/90 font-medium">
                {exportType === 'video' ? '動画ファイル' : 'ZIPアーカイブ'}
              </span>
            </div>
            <div className="font-mono text-xs text-amber-300 bg-neutral-900/90 px-3 py-2 rounded-lg border border-neutral-800 break-all flex items-center gap-2">
              {exportType === 'video' ? (
                <FileVideo className="w-4 h-4 flex-shrink-0 text-amber-400" />
              ) : (
                <FolderArchive className="w-4 h-4 flex-shrink-0 text-sky-400" />
              )}
              <span>{previewFilename}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-neutral-800 bg-neutral-850 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          {/* Skip / Don't Input Button */}
          <button
            id="btn-export-skip-info"
            onClick={onConfirmWithoutInfo}
            className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors cursor-pointer text-center"
          >
            入力しないで書き出す
          </button>

          {/* Input & Export Button */}
          <button
            id="btn-export-with-info"
            onClick={handleExportWithInfo}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{hasInput ? '年・組・番・氏名を入れて書き出す' : 'このまま書き出す'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
