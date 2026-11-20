"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookHeart, Sparkles } from "lucide-react";
import {
  type CompactKitchenData,
  type KitchenIndex,
  buildKitchenIndex,
  lookupCombination,
  pickRandomCombo,
} from "@/lib/kitchen-engine";
import {
  DEFAULT_MEME_CONFIG,
  type MemeConfig,
  copyStickerToClipboard,
  downloadStickerPng,
  shareSticker,
  supportsFileShare,
} from "@/lib/sticker-canvas";
import {
  isSoundMuted,
  playCookSuccessSound,
  playPopSound,
  playShuffleSound,
  setSoundMuted,
} from "@/lib/sound-fx";
import type { HotCombo } from "@/lib/vietnamese-keywords";
import { CookingStage } from "./CookingStage";
import { EmojiPicker } from "./EmojiPicker";
import { HistoryDialog, type SavedComboEntry } from "./HistoryDialog";
import { HotCombosBar } from "./HotCombosBar";
import { MemeEditorPanel } from "./MemeEditorPanel";

const FAVORITES_KEY = "nau-emoji:favorites";
const HISTORY_KEY = "nau-emoji:history";

function isSavedComboEntry(value: unknown): value is SavedComboEntry {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.leftCp === "string" &&
    candidate.leftCp.length > 0 &&
    typeof candidate.rightCp === "string" &&
    candidate.rightCp.length > 0 &&
    typeof candidate.savedAt === "number"
  );
}

function readStorageList(key: string): SavedComboEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSavedComboEntry) : [];
  } catch {
    return [];
  }
}

function writeStorageList(key: string, items: SavedComboEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // ignore quota / private browsing errors
  }
}

export function KitchenApp() {
  const [index, setIndex] = useState<KitchenIndex | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(1);
  const [activeSlot, setActiveSlot] = useState<"left" | "right">("right");

  const [memeConfig, setMemeConfig] = useState<MemeConfig>(DEFAULT_MEME_CONFIG);
  const [muted, setMuted] = useState(false);
  const [favorites, setFavorites] = useState<SavedComboEntry[]>([]);
  const [history, setHistory] = useState<SavedComboEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "busy" | "done">("idle");
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPickedSlotRef = useRef<"left" | "right">("right");
  const storageReadyRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3400);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    setMuted(isSoundMuted());
    setFavorites(readStorageList(FAVORITES_KEY));
    setHistory(readStorageList(HISTORY_KEY));
    storageReadyRef.current = true;
    setCanShare(supportsFileShare());

    let cancelled = false;
    fetch("/data/kitchen-v1.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<CompactKitchenData>;
      })
      .then((raw) => {
        if (cancelled) return;
        const built = buildKitchenIndex(raw);
        setIndex(built);

        // Khởi tạo từ URL query nếu có (?a=...&b=...&t=...)
        const params = new URLSearchParams(window.location.search);
        const paramA = params.get("a") ?? "1f47b";
        const paramB = params.get("b") ?? "1f920";
        const paramText = params.get("t");

        const idxA = built.cpToIndex.get(paramA);
        const idxB = built.cpToIndex.get(paramB);

        if (idxA !== undefined && idxB !== undefined) {
          setLeftIdx(idxA);
          setRightIdx(idxB);
        } else {
          const picked = pickRandomCombo(built);
          setLeftIdx(picked.leftIdx);
          setRightIdx(picked.rightIdx);
        }

        if (paramText) {
          setMemeConfig((prev) => ({
            ...prev,
            enabled: true,
            text: paramText.slice(0, 42),
          }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Không tải được kho công thức emoji. Thử tải lại trang nhé!");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const leftEmoji = index ? (index.emojis[leftIdx] ?? null) : null;
  const rightEmoji = index ? (index.emojis[rightIdx] ?? null) : null;

  const combo = useMemo(() => {
    if (!index) return null;
    return lookupCombination(index, leftIdx, rightIdx);
  }, [index, leftIdx, rightIdx]);

  // Đồng bộ URL query có debounce 400ms & try/catch tránh SecurityError trên Safari
  useEffect(() => {
    if (!leftEmoji || !rightEmoji) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      params.set("a", leftEmoji.codepoint);
      params.set("b", rightEmoji.codepoint);
      if (memeConfig.enabled && memeConfig.text.trim()) {
        params.set("t", memeConfig.text.trim());
      }
      const nextUrl = `${window.location.pathname}?${params.toString()}`;
      try {
        window.history.replaceState(null, "", nextUrl);
      } catch {
        // Bỏ qua giới hạn tần suất replaceState trên Safari
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [leftEmoji, rightEmoji, memeConfig.enabled, memeConfig.text]);

  // Ghi nhận lịch sử món đã nấu (thuần khiết trong updater, lưu localStorage qua effect riêng)
  useEffect(() => {
    if (!combo) return;
    const lCp = combo.left.codepoint;
    const rCp = combo.right.codepoint;
    setHistory((prev) => {
      const filtered = prev.filter(
        (x) =>
          !(
            (x.leftCp === lCp && x.rightCp === rCp) ||
            (x.leftCp === rCp && x.rightCp === lCp)
          ),
      );
      return [{ leftCp: lCp, rightCp: rCp, savedAt: Date.now() }, ...filtered].slice(
        0,
        40,
      );
    });
  }, [combo]);

  useEffect(() => {
    if (!storageReadyRef.current) return;
    writeStorageList(HISTORY_KEY, history);
  }, [history]);

  useEffect(() => {
    if (!storageReadyRef.current) return;
    writeStorageList(FAVORITES_KEY, favorites);
  }, [favorites]);

  const isFavorite = useMemo(() => {
    if (!leftEmoji || !rightEmoji) return false;
    return favorites.some(
      (f) =>
        (f.leftCp === leftEmoji.codepoint && f.rightCp === rightEmoji.codepoint) ||
        (f.leftCp === rightEmoji.codepoint && f.rightCp === leftEmoji.codepoint),
    );
  }, [favorites, leftEmoji, rightEmoji]);

  const handleToggleFavorite = () => {
    if (!leftEmoji || !rightEmoji) return;
    playPopSound();
    const lCp = leftEmoji.codepoint;
    const rCp = rightEmoji.codepoint;
    const alreadyExists = isFavorite;

    setFavorites((prev) => {
      const exists = prev.some(
        (f) =>
          (f.leftCp === lCp && f.rightCp === rCp) ||
          (f.leftCp === rCp && f.rightCp === lCp),
      );
      return exists
        ? prev.filter(
            (f) =>
              !(
                (f.leftCp === lCp && f.rightCp === rCp) ||
                (f.leftCp === rCp && f.rightCp === lCp)
              ),
          )
        : [{ leftCp: lCp, rightCp: rCp, savedAt: Date.now() }, ...prev].slice(
            0,
            60,
          );
    });

    showToast(
      alreadyExists ? "Đã bỏ khỏi Yêu thích" : "Đã lưu vào Sổ Yêu Thích ❤️",
    );
  };

  const handlePickLeft = (idx: number) => {
    if (!index) return;
    lastPickedSlotRef.current = "left";
    setLeftIdx(idx);
    if (lookupCombination(index, idx, rightIdx)) {
      playCookSuccessSound();
    } else {
      const partners = index.adjacency[idx];
      if (partners && partners.size > 0) {
        const firstPartner = partners.values().next().value;
        if (firstPartner !== undefined) setRightIdx(firstPartner);
      }
      playPopSound();
    }
  };

  const handlePickRight = (idx: number) => {
    if (!index) return;
    lastPickedSlotRef.current = "right";
    setRightIdx(idx);
    if (lookupCombination(index, leftIdx, idx)) {
      playCookSuccessSound();
    } else {
      playPopSound();
    }
  };

  const handleFixIncompatible = () => {
    if (!index) return;
    // Giữ lại emoji người dùng vừa chọn và ghép đối tác hợp lệ cho ô còn lại
    if (lastPickedSlotRef.current === "right") {
      const next = pickRandomCombo(index, rightIdx, leftIdx);
      setLeftIdx(next.rightIdx);
    } else {
      const next = pickRandomCombo(index, leftIdx, rightIdx);
      setRightIdx(next.rightIdx);
    }
    playCookSuccessSound();
  };

  const handleRandomizeBoth = () => {
    if (!index) return;
    const next = pickRandomCombo(index, undefined, leftIdx);
    setLeftIdx(next.leftIdx);
    setRightIdx(next.rightIdx);
    playShuffleSound();
  };

  const handleRandomSlot = (slot: "left" | "right") => {
    if (!index) return;
    lastPickedSlotRef.current = slot;
    if (slot === "right") {
      const next = pickRandomCombo(index, leftIdx, rightIdx);
      setRightIdx(next.rightIdx);
    } else {
      const next = pickRandomCombo(index, rightIdx, leftIdx);
      setLeftIdx(next.rightIdx);
    }
    playPopSound();
  };

  const handleSwapSlots = () => {
    setLeftIdx(rightIdx);
    setRightIdx(leftIdx);
    playPopSound();
  };

  const handleSelectHotCombo = (hot: HotCombo) => {
    if (!index) return;
    const lIdx = index.cpToIndex.get(hot.leftCp);
    const rIdx = index.cpToIndex.get(hot.rightCp);
    if (lIdx !== undefined && rIdx !== undefined) {
      setLeftIdx(lIdx);
      setRightIdx(rIdx);
      playCookSuccessSound();
    }
  };

  const handleSelectPairByCp = (leftCp: string, rightCp: string) => {
    if (!index) return;
    const lIdx = index.cpToIndex.get(leftCp);
    const rIdx = index.cpToIndex.get(rightCp);
    if (lIdx !== undefined && rIdx !== undefined) {
      setLeftIdx(lIdx);
      setRightIdx(rIdx);
      playCookSuccessSound();
    }
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
    if (!next) playPopSound();
  };

  const handleCopy = async () => {
    if (!combo || copyState === "busy") return;
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
    setCopyState("busy");
    try {
      const res = await copyStickerToClipboard(combo.proxyUrl, memeConfig);
      if (res === "copied") {
        setCopyState("done");
        playCookSuccessSound();
        showToast("Đã copy Sticker! Vào Zalo / Messenger bấm Dán là gửi ngay ✨");
        copyTimerRef.current = setTimeout(() => {
          setCopyState("idle");
          copyTimerRef.current = null;
        }, 2000);
      } else {
        await downloadStickerPng(combo.proxyUrl, memeConfig, combo.filename);
        setCopyState("idle");
        showToast("Trình duyệt này chưa hỗ trợ copy ảnh, đã tải PNG về máy cho bạn!");
      }
    } catch {
      setCopyState("idle");
      showToast("Không copy được tự động — bấm Tải PNG hoặc Gửi ngay nhé!");
    }
  };

  const handleDownload = async () => {
    if (!combo || downloadBusy) return;
    setDownloadBusy(true);
    try {
      await downloadStickerPng(combo.proxyUrl, memeConfig, combo.filename);
      playCookSuccessSound();
      showToast("Đã tải xong ảnh Sticker PNG! 🎉");
    } catch {
      showToast("Có lỗi khi tải ảnh, bạn thử lại nhé!");
    } finally {
      setDownloadBusy(false);
    }
  };

  const handleShare = async () => {
    if (!combo || shareBusy) return;
    setShareBusy(true);
    try {
      const result = await shareSticker(
        combo.proxyUrl,
        memeConfig,
        combo.filename,
        `Nấu Emoji: ${combo.left.char} + ${combo.right.char}`,
      );
      if (result === "unsupported") {
        await downloadStickerPng(combo.proxyUrl, memeConfig, combo.filename);
        showToast("Thiết bị không hỗ trợ chia sẻ trực tiếp, đã tải PNG cho bạn!");
      }
    } catch {
      try {
        await downloadStickerPng(combo.proxyUrl, memeConfig, combo.filename);
        showToast("Không mở được bảng chia sẻ, đã tải PNG về máy cho bạn!");
      } catch {
        showToast("Có lỗi khi chia sẻ sticker, bạn thử bấm Tải PNG nhé!");
      }
    } finally {
      setShareBusy(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-dvh pb-14">
      {/* Header nhỏ gọn vui tươi */}
      <header className="max-w-5xl mx-auto px-4 pt-4 pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon.svg"
            alt="Logo Nấu Emoji"
            width={44}
            height={44}
            className="w-11 h-11 rounded-2xl shadow-sm animate-float-gentle"
          />
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2D1D42] leading-none flex items-center gap-1.5">
              <span>Nấu Emoji</span>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-[#FFE4EE] text-[#A91A4F]">
                147k+ món
              </span>
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#5B4B73]">
              Trộn sticker siêu lầy &amp; chế meme tiếng Việt cực nhanh
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          aria-label={`Mở Sổ Sưu Tập (${favorites.length} món yêu thích)`}
          className="clay-btn bg-white border-2 border-[#EFE4F7] text-[#2D1D42] px-3.5 py-2 text-xs sm:text-sm inline-flex items-center gap-1.5 hover:border-[#FF9DC0] cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F]"
        >
          <BookHeart className="w-4 h-4 text-[#C2225D]" aria-hidden="true" />
          <span className="hidden sm:inline">Sổ Sưu Tập</span>
          <span className="px-1.5 py-0.5 rounded-full bg-[#FFE4EE] text-[#A91A4F] text-[11px] font-black">
            {favorites.length}
          </span>
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 space-y-4 sm:space-y-5">
        {loadError ? (
          <div className="clay-card p-8 text-center">
            <p className="text-base font-extrabold text-[#B81D56] mb-3">
              {loadError}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="clay-btn clay-btn-primary px-5 py-2.5 text-sm cursor-pointer"
            >
              Tải lại trang
            </button>
          </div>
        ) : !index ? (
          <div className="clay-card p-10 text-center space-y-3">
            <div className="text-5xl motion-safe:animate-bounce" aria-hidden="true">
              🍲
            </div>
            <p className="font-display text-xl font-extrabold text-[#2D1D42]">
              Đang nhóm lửa bếp Nấu Emoji...
            </p>
            <p className="text-sm font-bold text-[#5B4B73]">
              Đang tải 147.000+ công thức sticker siêu nhẹ (~138 KB)
            </p>
          </div>
        ) : (
          <>
            <CookingStage
              leftEmoji={leftEmoji}
              rightEmoji={rightEmoji}
              activeSlot={activeSlot}
              onSelectSlot={setActiveSlot}
              combo={combo}
              memeConfig={memeConfig}
              onToggleMemeMode={() => {
                playPopSound();
                setMemeConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
              }}
              onRandomizeBoth={handleRandomizeBoth}
              onFixIncompatible={handleFixIncompatible}
              onSwapSlots={handleSwapSlots}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              muted={muted}
              onToggleMute={handleToggleMute}
              onCopy={handleCopy}
              onDownload={handleDownload}
              onShare={handleShare}
              canShare={canShare}
              copyState={copyState}
              downloadBusy={downloadBusy}
              shareBusy={shareBusy}
            />

            <MemeEditorPanel config={memeConfig} onChange={setMemeConfig} />

            <HotCombosBar
              onSelectCombo={handleSelectHotCombo}
              activeLeftCp={leftEmoji?.codepoint}
              activeRightCp={rightEmoji?.codepoint}
            />

            <EmojiPicker
              index={index}
              leftIdx={leftIdx}
              rightIdx={rightIdx}
              activeSlot={activeSlot}
              onSelectSlot={setActiveSlot}
              onPickLeft={handlePickLeft}
              onPickRight={handlePickRight}
              onRandomSlot={handleRandomSlot}
            />

            <HistoryDialog
              open={dialogOpen}
              onClose={handleCloseDialog}
              index={index}
              favorites={favorites}
              history={history}
              onSelectPair={handleSelectPairByCp}
              onClearHistory={handleClearHistory}
            />
          </>
        )}
      </main>

      {/* Footer gọn nhẹ */}
      <footer className="max-w-5xl mx-auto px-4 pt-6 text-center text-xs font-bold text-[#5B4B73]">
        <p className="inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#C9225F] shrink-0" aria-hidden="true" />
          <span>
            Nấu Emoji Studio • Mẹo iPhone: bấm Copy rồi Dán vào Zalo/Messenger
            hoặc Ghi chú
          </span>
        </p>
      </footer>

      {/* Toast thông báo */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-[#2D1D42] text-white text-xs sm:text-sm font-extrabold shadow-xl text-center leading-snug max-w-[92vw] sm:max-w-md"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
