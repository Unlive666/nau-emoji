"use client";

import { useEffect, useRef, useState } from "react";
import { BookHeart, Clock, Heart, Trash2, X } from "lucide-react";
import { type KitchenIndex, lookupCombination } from "@/lib/kitchen-engine";

export interface SavedComboEntry {
  leftCp: string;
  rightCp: string;
  savedAt: number;
}

interface HistoryDialogProps {
  open: boolean;
  onClose: () => void;
  index: KitchenIndex;
  favorites: SavedComboEntry[];
  history: SavedComboEntry[];
  onSelectPair: (leftCp: string, rightCp: string) => void;
  onClearHistory: () => void;
}

export function HistoryDialog({
  open,
  onClose,
  index,
  favorites,
  history,
  onSelectPair,
  onClearHistory,
}: HistoryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [tab, setTab] = useState<"favorites" | "history">("favorites");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Fallback light-dismiss cho Safari chưa hỗ trợ closedby="any"
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };
    dialog.addEventListener("close", handleClose);

    if ("closedBy" in HTMLDialogElement.prototype) {
      return () => dialog.removeEventListener("close", handleClose);
    }

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    let pressedOutside = false;
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);

    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, [onClose]);

  const list = tab === "favorites" ? favorites : history;

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="collection-dialog-title"
      className="w-[min(92vw,560px)] max-h-[82dvh] rounded-[32px] p-0 border-4 border-white bg-[#FFFDFB] text-[#2D1D42] shadow-2xl overflow-hidden"
    >
      <div className="p-4 sm:p-5 flex flex-col max-h-[80dvh]">
        <div className="flex items-center justify-between gap-2 pb-3 border-b-2 border-[#F4E9FA]">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-[#FFE4EE] text-[#E03E76] flex items-center justify-center">
              <BookHeart className="w-5 h-5" />
            </span>
            <h2
              id="collection-dialog-title"
              className="font-display text-xl font-extrabold"
            >
              Sổ Sưu Tập Bếp
            </h2>
          </div>

          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Đóng sổ sưu tập"
            className="w-10 h-10 rounded-full bg-[#F7F1FA] text-[#5B4B73] flex items-center justify-center hover:bg-[#EDE0F5] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between gap-2 my-3">
          <div
            role="tablist"
            aria-label="Phân loại sổ sưu tập"
            className="inline-flex rounded-2xl bg-[#F7F1FA] p-1"
          >
            <button
              id="tab-favorites"
              type="button"
              role="tab"
              aria-selected={tab === "favorites"}
              aria-controls="panel-collection"
              onClick={() => setTab("favorites")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F] ${
                tab === "favorites"
                  ? "bg-white text-[#C2225D] shadow-sm"
                  : "text-[#5B4B73]"
              }`}
            >
              <Heart className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Yêu thích ({favorites.length})</span>
            </button>

            <button
              id="tab-history"
              type="button"
              role="tab"
              aria-selected={tab === "history"}
              aria-controls="panel-collection"
              onClick={() => setTab("history")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F] ${
                tab === "history"
                  ? "bg-white text-[#2D1D42] shadow-sm"
                  : "text-[#5B4B73]"
              }`}
            >
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Đã nấu ({history.length})</span>
            </button>
          </div>

          {tab === "history" && history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="text-xs font-extrabold text-[#5B4B73] hover:text-[#C2225D] inline-flex items-center gap-1 cursor-pointer px-2 py-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F]"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Xóa lịch sử</span>
            </button>
          )}
        </div>

        {/* Grid món */}
        <div
          id="panel-collection"
          role="tabpanel"
          aria-labelledby={tab === "favorites" ? "tab-favorites" : "tab-history"}
          className="overflow-y-auto flex-1 pr-1"
        >
          {list.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-2" aria-hidden="true">🍳</div>
              <p className="text-sm font-bold text-[#6B5B82]">
                {tab === "favorites"
                  ? "Chưa có món yêu thích nào. Bấm ❤️ ở bếp để lưu lại nhé!"
                  : "Chưa có lịch sử món nấu. Hãy trộn vài emoji ngay!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {list.map((item) => {
                const lIdx = index.cpToIndex.get(item.leftCp);
                const rIdx = index.cpToIndex.get(item.rightCp);
                if (lIdx === undefined || rIdx === undefined) return null;
                const combo = lookupCombination(index, lIdx, rIdx);
                if (!combo) return null;

                return (
                  <button
                    key={`${item.leftCp}-${item.rightCp}`}
                    type="button"
                    aria-label={`Chọn lại món ${combo.left.viLabel} kết hợp ${combo.right.viLabel}`}
                    onClick={() => {
                      onSelectPair(item.leftCp, item.rightCp);
                      dialogRef.current?.close();
                    }}
                    className="p-2.5 rounded-2xl bg-[#FFF8FB] border-2 border-[#F4E6F7] hover:border-[#C9225F] flex flex-col items-center gap-1.5 transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={combo.proxyUrl}
                      alt={`Sticker ${combo.left.viLabel} và ${combo.right.viLabel}`}
                      width={64}
                      height={64}
                      loading="lazy"
                      className="w-14 h-14 object-contain"
                    />
                    <span className="text-xs font-extrabold text-[#5B4B73]">
                      {combo.left.char} + {combo.right.char}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
