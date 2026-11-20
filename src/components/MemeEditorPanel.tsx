"use client";

import { Eraser, Sparkles } from "lucide-react";
import {
  BG_PRESETS,
  type MemeConfig,
  TEXT_PRESETS,
} from "@/lib/sticker-canvas";
import { TREND_CHIPS } from "@/lib/vietnamese-keywords";

interface MemeEditorPanelProps {
  config: MemeConfig;
  onChange: (next: MemeConfig) => void;
}

export function MemeEditorPanel({ config, onChange }: MemeEditorPanelProps) {
  if (!config.enabled) return null;

  return (
    <section
      aria-label="Xưởng chế Sticker Meme"
      className="clay-card p-4 sm:p-5 bg-gradient-to-br from-[#FBF8FF] to-[#FFF6FB] border-2 border-[#EADFFF]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-[#7C5CFF] text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-extrabold text-[#2D1D42] leading-tight">
              Xưởng Chế Sticker Meme
            </h2>
            <p className="text-xs font-bold text-[#6B5B82]">
              Bật viền trắng & gõ câu trend tiếng Việt để dán Zalo / Messenger
            </p>
          </div>
        </div>

        {/* Công tắc Viền trắng Sticker */}
        <label className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-white border-2 border-[#E9DDFB] cursor-pointer select-none shadow-sm focus-within:ring-2 focus-within:ring-[#6140EB]">
          <input
            type="checkbox"
            checked={config.whiteOutline}
            onChange={(e) =>
              onChange({ ...config, whiteOutline: e.target.checked })
            }
            className="w-4 h-4 accent-[#6140EB] cursor-pointer"
          />
          <span className="text-sm font-extrabold text-[#2D1D42]">
            Viền trắng Sticker
          </span>
        </label>
      </div>

      {/* Ô nhập chữ Meme */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            maxLength={42}
            value={config.text}
            onChange={(e) => onChange({ ...config, text: e.target.value })}
            placeholder="Nhập chữ meme... (VD: Hết cứu, Ét ô ét!)"
            aria-label="Chữ trên sticker meme"
            className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-white border-2 border-[#E6D9FA] text-sm sm:text-base font-bold text-[#2D1D42] placeholder:text-[#6B5B82] focus:border-[#6140EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6140EB]/50"
          />
          {config.text && (
            <button
              type="button"
              onClick={() => onChange({ ...config, text: "" })}
              aria-label="Xóa chữ meme"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#F5EEFF] text-[#5B4B73] flex items-center justify-center hover:bg-[#E7D8FF] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6140EB]"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div
          role="group"
          aria-label="Vị trí chữ meme"
          className="inline-flex rounded-2xl bg-white border-2 border-[#E6D9FA] p-1"
        >
          <button
            type="button"
            aria-pressed={config.textPosition === "bottom"}
            onClick={() => onChange({ ...config, textPosition: "bottom" })}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6140EB] ${
              config.textPosition === "bottom"
                ? "bg-[#6140EB] text-white"
                : "text-[#5B4B73]"
            }`}
          >
            Dưới
          </button>
          <button
            type="button"
            aria-pressed={config.textPosition === "top"}
            onClick={() => onChange({ ...config, textPosition: "top" })}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6140EB] ${
              config.textPosition === "top"
                ? "bg-[#6140EB] text-white"
                : "text-[#5B4B73]"
            }`}
          >
            Trên
          </button>
        </div>
      </div>

      {/* Dải chip câu trend 1 chạm */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
        {TREND_CHIPS.map((phrase) => {
          const active = config.text.trim() === phrase;
          return (
            <button
              key={phrase}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onChange({
                  ...config,
                  text: active ? "" : phrase,
                })
              }
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-extrabold border-2 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F] ${
                active
                  ? "bg-[#C9225F] border-[#A91A4F] text-white"
                  : "bg-white border-[#EFE4F7] text-[#4E3B6B] hover:border-[#FF9DC0]"
              }`}
            >
              {phrase}
            </button>
          );
        })}
      </div>

      {/* Kiểu màu chữ & Nền sticker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#EFE4FA]">
        <div>
          <span className="block text-xs font-extrabold text-[#5B4B73] mb-1.5">
            Màu chữ
          </span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Chọn màu chữ meme">
            {TEXT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={config.textStyle === preset.id}
                onClick={() => onChange({ ...config, textStyle: preset.id })}
                className={`px-3 py-1 rounded-full text-xs font-extrabold border-2 flex items-center gap-1.5 cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6140EB] ${
                  config.textStyle === preset.id
                    ? "border-[#6140EB] bg-[#F3EEFF] text-[#2D1D42]"
                    : "border-[#EFE4F7] bg-white text-[#5B4B73]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="w-3.5 h-3.5 rounded-full border border-black/20"
                  style={{ backgroundColor: preset.fill }}
                />
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-xs font-extrabold text-[#5B4B73] mb-1.5">
            Nền ảnh
          </span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Chọn nền ảnh sticker">
            {BG_PRESETS.map((bg) => (
              <button
                key={bg.id}
                type="button"
                aria-pressed={config.bgStyle === bg.id}
                onClick={() => onChange({ ...config, bgStyle: bg.id })}
                className={`px-3 py-1 rounded-full text-xs font-extrabold border-2 flex items-center gap-1.5 cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F] ${
                  config.bgStyle === bg.id
                    ? "border-[#C9225F] bg-[#FFF0F6] text-[#2D1D42]"
                    : "border-[#EFE4F7] bg-white text-[#5B4B73]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`w-3.5 h-3.5 rounded-full border border-black/15 ${
                    bg.swatch === "transparent" ? "checkerboard-bg" : ""
                  }`}
                  style={
                    bg.swatch !== "transparent"
                      ? { backgroundColor: bg.swatch }
                      : undefined
                  }
                />
                {bg.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
