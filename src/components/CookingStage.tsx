"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Check,
  Copy,
  Dices,
  Download,
  Heart,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { CombinationResult, EmojiItem } from "@/lib/kitchen-engine";
import { type MemeConfig, renderStickerToCanvas } from "@/lib/sticker-canvas";
import { EmojiGraphic } from "./EmojiGraphic";

interface CookingStageProps {
  leftEmoji: EmojiItem | null;
  rightEmoji: EmojiItem | null;
  activeSlot: "left" | "right";
  onSelectSlot: (slot: "left" | "right") => void;
  combo: CombinationResult | null;
  memeConfig: MemeConfig;
  onToggleMemeMode: () => void;
  onRandomizeBoth: () => void;
  onFixIncompatible: () => void;
  onSwapSlots: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  muted: boolean;
  onToggleMute: () => void;
  onCopy: () => Promise<void>;
  onDownload: () => Promise<void>;
  onShare: () => Promise<void>;
  canShare: boolean;
  copyState: "idle" | "busy" | "done";
  downloadBusy: boolean;
  shareBusy: boolean;
}

export function CookingStage({
  leftEmoji,
  rightEmoji,
  activeSlot,
  onSelectSlot,
  combo,
  memeConfig,
  onToggleMemeMode,
  onRandomizeBoth,
  onFixIncompatible,
  onSwapSlots,
  isFavorite,
  onToggleFavorite,
  muted,
  onToggleMute,
  onCopy,
  onDownload,
  onShare,
  canShare,
  copyState,
  downloadBusy,
  shareBusy,
}: CookingStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevTextRef = useRef(memeConfig.text);
  const [imgStatus, setImgStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [imgRetrySeed, setImgRetrySeed] = useState(0);
  const [canvasState, setCanvasState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [canvasRetrySeed, setCanvasRetrySeed] = useState(0);

  const showCanvas =
    memeConfig.enabled &&
    (memeConfig.whiteOutline ||
      memeConfig.text.trim().length > 0 ||
      memeConfig.bgStyle !== "transparent");

  useEffect(() => {
    if (!showCanvas && combo) {
      setImgStatus("loading");
    }
  }, [combo, showCanvas, imgRetrySeed]);

  useEffect(() => {
    const textChanged = prevTextRef.current !== memeConfig.text;
    prevTextRef.current = memeConfig.text;

    if (!showCanvas || !combo || !canvasRef.current) {
      setCanvasState("loading");
      return;
    }

    const controller = new AbortController();
    const delayMs = textChanged ? 90 : 0;

    setCanvasState("loading");

    const runRender = () => {
      if (controller.signal.aborted || !canvasRef.current) return;
      renderStickerToCanvas(
        canvasRef.current,
        combo.proxyUrl,
        memeConfig,
        512,
        controller.signal,
      )
        .then(() => {
          if (!controller.signal.aborted) {
            setCanvasState("ready");
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setCanvasState("error");
          }
        });
    };

    const timer =
      delayMs > 0 ? window.setTimeout(runRender, delayMs) : null;
    if (delayMs === 0) {
      runRender();
    }

    return () => {
      controller.abort();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [showCanvas, combo, memeConfig, canvasRetrySeed]);

  return (
    <section
      aria-label="Khu vực nồi nấu emoji"
      className="clay-card p-4 sm:p-6 relative overflow-hidden"
    >
      {/* Thanh trạng thái & nút âm thanh / yêu thích */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF2D9] border-2 border-[#FFE1A3] text-xs sm:text-sm font-extrabold text-[#6E3F00]">
          <span aria-hidden="true">🍲</span>
          <span>Bếp Nấu Kẹo Ngọt</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleFavorite}
            disabled={!combo}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Bỏ yêu thích món này" : "Lưu món yêu thích"}
            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-transform active:scale-90 cursor-pointer disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F] ${
              isFavorite
                ? "bg-[#FFE0EB] border-[#C9225F] text-[#B81D56]"
                : "bg-white border-[#EFE4F7] text-[#5B4B73] hover:border-[#FF9DC0]"
            }`}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={muted}
            aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white border-2 border-[#EFE4F7] text-[#5B4B73] hover:border-[#C5B4E3] transition-transform active:scale-90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6140EB]"
          >
            {muted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5 text-[#117A70]" />
            )}
          </button>
        </div>
      </div>

      {/* Bố cục chính: 2 ô nguyên liệu + Nồi thành phẩm */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6">
        {/* Cột 1: Hai ô nguyên liệu */}
        <div className="flex items-center justify-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => onSelectSlot("left")}
            aria-pressed={activeSlot === "left"}
            aria-label={
              leftEmoji
                ? `Chọn ô Món 1, hiện tại là ${leftEmoji.viLabel}`
                : "Chọn ô Món 1"
            }
            className={`clay-slot w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center gap-1 cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F] ${
              activeSlot === "left" ? "clay-slot-active scale-[1.03]" : "hover:scale-[1.02]"
            }`}
          >
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#5B4B73]">
              Món 1
            </span>
            {leftEmoji ? (
              <EmojiGraphic
                codepoint={leftEmoji.codepoint}
                char={leftEmoji.char}
                alt={leftEmoji.viLabel}
                sizeClass="w-12 h-12 sm:w-14 sm:h-14"
                priority
              />
            ) : (
              <span className="text-3xl opacity-40">?</span>
            )}
            {activeSlot === "left" && (
              <span className="md:hidden absolute -bottom-2 px-2 py-0.5 rounded-full bg-[#C9225F] text-white text-[10px] font-black shadow">
                Đang chọn
              </span>
            )}
          </button>

          <div className="flex flex-col items-center gap-1.5">
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-full bg-[#FFE9B8] text-[#6E3F00] font-display font-extrabold text-xl flex items-center justify-center shadow-sm"
            >
              +
            </span>
            <button
              type="button"
              onClick={onSwapSlots}
              title="Đổi vị trí 2 nguyên liệu"
              aria-label="Đổi vị trí 2 nguyên liệu"
              className="w-9 h-9 rounded-full bg-white border-2 border-[#EFE4F7] text-[#5B4B73] flex items-center justify-center hover:bg-[#FFF5FA] active:scale-90 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F]"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSelectSlot("right")}
            aria-pressed={activeSlot === "right"}
            aria-label={
              rightEmoji
                ? `Chọn ô Món 2, hiện tại là ${rightEmoji.viLabel}`
                : "Chọn ô Món 2"
            }
            className={`clay-slot w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center gap-1 cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F] ${
              activeSlot === "right" ? "clay-slot-active scale-[1.03]" : "hover:scale-[1.02]"
            }`}
          >
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#5B4B73]">
              Món 2
            </span>
            {rightEmoji ? (
              <EmojiGraphic
                codepoint={rightEmoji.codepoint}
                char={rightEmoji.char}
                alt={rightEmoji.viLabel}
                sizeClass="w-12 h-12 sm:w-14 sm:h-14"
                priority
              />
            ) : (
              <span className="text-3xl opacity-40">?</span>
            )}
            {activeSlot === "right" && (
              <span className="md:hidden absolute -bottom-2 px-2 py-0.5 rounded-full bg-[#C9225F] text-white text-[10px] font-black shadow">
                Đang chọn
              </span>
            )}
          </button>
        </div>

        {/* Mũi tên / Nút Gacha */}
        <div className="flex md:flex-col items-center justify-center gap-2">
          <button
            type="button"
            onClick={onRandomizeBoth}
            className="clay-btn clay-btn-mango px-4 py-2.5 text-sm sm:text-base flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#784600]"
          >
            <Dices className="w-5 h-5" aria-hidden="true" />
            <span>Quay Nhân Phẩm</span>
          </button>
        </div>

        {/* Cột 3: Đĩa Sticker Thành Phẩm */}
        <div className="flex flex-col items-center justify-center">
          <div
            className={`relative w-52 h-52 sm:w-60 sm:h-60 rounded-[34px] border-4 border-white shadow-[0_14px_30px_-8px_rgba(84,44,114,0.22),inset_0_4px_12px_rgba(255,255,255,0.9)] flex items-center justify-center overflow-hidden ${
              showCanvas && memeConfig.bgStyle !== "transparent"
                ? "bg-white"
                : "checkerboard-bg"
            }`}
          >
            {combo ? (
              <>
                {showCanvas ? (
                  <>
                    <canvas
                      ref={canvasRef}
                      width={512}
                      height={512}
                      role="img"
                      aria-label={`Sticker chế từ ${combo.left.viLabel} và ${combo.right.viLabel}`}
                      className={`w-48 h-48 sm:w-56 sm:h-56 object-contain transition-opacity duration-150 ${
                        canvasState === "ready"
                          ? "opacity-100 animate-cook-pop"
                          : canvasState === "error"
                            ? "hidden"
                            : "opacity-40"
                      }`}
                    />
                    {canvasState === "loading" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="px-3 py-1 rounded-full bg-white/95 text-xs font-extrabold text-[#5B4B73] shadow">
                          Đang nặn sticker...
                        </span>
                      </div>
                    )}
                    {canvasState === "error" && (
                      <div className="text-center px-4">
                        <p className="text-sm font-bold text-[#5B4B73] mb-2">
                          Mạng hơi chậm, chưa nặn được ảnh!
                        </p>
                        <button
                          type="button"
                          onClick={() => setCanvasRetrySeed((n) => n + 1)}
                          className="clay-btn clay-btn-primary px-4 py-1.5 text-xs cursor-pointer"
                        >
                          Thử lại
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={`${combo.proxyUrl}-${imgRetrySeed}`}
                      src={combo.proxyUrl}
                      alt={`Sticker trộn từ ${combo.left.viLabel} và ${combo.right.viLabel}`}
                      width={240}
                      height={240}
                      fetchPriority="high"
                      decoding="async"
                      onLoad={() => setImgStatus("ready")}
                      onError={() => setImgStatus("error")}
                      className={`w-44 h-44 sm:w-48 sm:h-48 object-contain select-none transition-opacity duration-150 ${
                        imgStatus === "error"
                          ? "hidden"
                          : imgStatus === "ready"
                            ? "opacity-100 animate-cook-pop"
                            : "opacity-0"
                      }`}
                    />
                    {imgStatus === "loading" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="px-3 py-1 rounded-full bg-white/95 text-xs font-extrabold text-[#5B4B73] shadow">
                          Đang nấu món...
                        </span>
                      </div>
                    )}
                  </>
                )}

                {imgStatus === "error" && !showCanvas && (
                  <div className="text-center px-4">
                    <p className="text-sm font-bold text-[#5B4B73] mb-2">
                      Mạng hơi chậm, thử tải lại nhé!
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setImgRetrySeed((n) => n + 1)}
                        className="clay-btn clay-btn-primary px-3.5 py-1.5 text-xs cursor-pointer"
                      >
                        Thử lại
                      </button>
                      <button
                        type="button"
                        onClick={onRandomizeBoth}
                        className="clay-btn bg-white border-2 border-[#EFE4F7] text-[#2D1D42] px-3.5 py-1.5 text-xs cursor-pointer"
                      >
                        Đổi món
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center px-4">
                <div className="text-4xl mb-2" aria-hidden="true">🥣</div>
                <p className="text-xs sm:text-sm font-extrabold text-[#5B4B73] mb-3">
                  2 món này chưa có công thức trộn!
                </p>
                <button
                  type="button"
                  onClick={onFixIncompatible}
                  className="clay-btn clay-btn-primary px-4 py-2 text-xs cursor-pointer"
                >
                  Ghép món hợp lệ ngay!
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thanh Xuất & Chế Meme 1 chạm */}
      <div className="mt-5 pt-4 border-t-2 border-[#F5EAF9] flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onCopy}
          disabled={!combo || copyState === "busy"}
          className="clay-btn clay-btn-primary px-5 py-2.5 text-sm sm:text-base flex items-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8E1241]"
        >
          {copyState === "done" ? (
            <>
              <Check className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              <span>Đã Copy Sticker!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              <span>{copyState === "busy" ? "Đang chép..." : "Copy Sticker"}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onDownload}
          disabled={!combo || downloadBusy}
          className="clay-btn clay-btn-mint px-5 py-2.5 text-sm sm:text-base flex items-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083A35]"
        >
          <Download className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          <span>{downloadBusy ? "Đang tải..." : "Tải PNG"}</span>
        </button>

        {canShare && (
          <button
            type="button"
            onClick={onShare}
            disabled={!combo || shareBusy}
            className="clay-btn bg-white border-2 border-[#EFE4F7] text-[#2D1D42] px-4 py-2.5 text-sm sm:text-base flex items-center gap-2 hover:bg-[#FFF6FB] cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6140EB]"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#6140EB]" aria-hidden="true" />
            <span>{shareBusy ? "Đang gửi..." : "Gửi ngay"}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleMemeMode}
          aria-expanded={memeConfig.enabled}
          className={`clay-btn px-4 py-2.5 text-sm sm:text-base flex items-center gap-2 cursor-pointer border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6140EB] ${
            memeConfig.enabled
              ? "bg-[#6140EB] border-[#4B2EC9] text-white shadow-[0_5px_0_#3A20AA]"
              : "bg-white border-[#E4D8FA] text-[#4B2EC9] hover:bg-[#F7F4FF]"
          }`}
        >
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          <span>Chế Sticker Meme</span>
        </button>
      </div>
    </section>
  );
}
