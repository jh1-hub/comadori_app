import React from 'react';
import { X, Sparkles, Smartphone, Eye, Layers, ShieldCheck, Film } from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-neutral-100">
        <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white font-['Zen_Maru_Gothic']">
              コマ撮り動画の作り方ガイド
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-neutral-300">
          <div className="flex gap-3 bg-neutral-850 p-3.5 rounded-xl border border-neutral-800">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">1. カメラをしっかり固定する</h4>
              <p className="text-neutral-400 text-xs leading-relaxed">
                スマートフォンやタブレットをスタンドや本などでしっかり固定すると、背景がブレず、人形や小物の動きがキレイに見えます。
              </p>
            </div>
          </div>

          <div className="flex gap-3 bg-neutral-850 p-3.5 rounded-xl border border-neutral-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">2. オニオンスキンを活用する</h4>
              <p className="text-neutral-400 text-xs leading-relaxed">
                直前に撮影したコマが半透明でカメラに重なります。人形を「少しだけ」動かす目安にして撮影を繰り返しましょう。
              </p>
            </div>
          </div>

          <div className="flex gap-3 bg-neutral-850 p-3.5 rounded-xl border border-neutral-800">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">3. 1秒あたり8〜12コマがおすすめ</h4>
              <p className="text-neutral-400 text-xs leading-relaxed">
                「再生」画面でフレームレート（FPS）を調整できます。学校や初心者には8〜10 FPSが滑らかで作りやすい速度です。
              </p>
            </div>
          </div>

          <div className="flex gap-3 bg-neutral-850 p-3.5 rounded-xl border border-neutral-800">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">4. IndexedDBで自動保存</h4>
              <p className="text-neutral-400 text-xs leading-relaxed">
                撮影したコマは即座にお使いのブラウザ内（IndexedDB）に安全に自動保存されます。誤ってタブを閉じたりリロードしてもデータは消えません。
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};
