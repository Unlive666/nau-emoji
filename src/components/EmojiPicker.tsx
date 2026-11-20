"use client";

import { useMemo, useState } from "react";
import { Dices, Filter, Search, X } from "lucide-react";
import {
  type EmojiItem,
  type KitchenIndex,
  getCompatibleIndices,
  searchEmojis,
} from "@/lib/kitchen-engine";
import { EMOJI_CATEGORIES } from "@/lib/vietnamese-keywords";
import { EmojiGraphic } from "./EmojiGraphic";

interface EmojiPickerProps {
  index: KitchenIndex;
  leftIdx: number;
  rightIdx: number;
  activeSlot: "left" | "right";
  onSelectSlot: (slot: "left" | "right") => void;
  onPickLeft: (idx: number) => void;
  onPickRight: (idx: number) => void;
  onRandomSlot: (slot: "left" | "right") => void;
}

function EmojiGrid({
  items,
  selectedIdx,
  compatibleSet,
  onlyCompatible,
  onPick,
}: {
  items: EmojiItem[];
  selectedIdx: number;
  compatibleSet: Set<number> | null;
  onlyCompatible: boolean;
  onPick: (idx: number) => void;
}) {
  const visibleItems = useMemo(() => {
    if (!compatibleSet || !onlyCompatible) return items;
    return items.filter((item) => compatibleSet.has(item.index));
  }, [items, compatibleSet, onlyCompatible]);

  if (visibleItems.length === 0) {
    return (
      <div className="py-10 text-center text-sm font-bold text-[#6B5B82]">
        Không tìm thấy emoji nào khớp từ khóa này 😅
      </div>
    );
  }

  return (
    <div className="grid grid-cols-6 sm:grid-cols-7 md:grid-cols-6 lg:grid-cols-7 gap-1.5 sm:gap-2 max-h-[340px] sm:max-h-[400px] overflow-y-auto pr-1">
      {visibleItems.map((item) => {
        const isSelected = item.index === selectedIdx;
        const isCompatible = compatibleSet ? compatibleSet.has(item.index) : true;

        return (
          <button
            key={item.codepoint}
            type="button"
            onClick={() => onPick(item.index)}
            title={item.viLabel}
            aria-label={`Chọn emoji ${item.viLabel}`}
            aria-pressed={isSelected}
            className={`emoji-tile-perf aspect-square rounded-2xl flex items-center justify-center transition-transform active:scale-90 cursor-pointer border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F] ${
              isSelected
                ? "bg-[#FFE0EB] border-[#C9225F] scale-105 shadow-sm"
                : isCompatible
                  ? "bg-white/85 border-transparent hover:border-[#FFD1E2] hover:bg-white"
                  : "bg-[#F7F1FA]/60 border-transparent opacity-40 hover:opacity-80"
            }`}
          >
            <EmojiGraphic
              codepoint={item.codepoint}
              char={item.char}
              alt={item.viLabel}
              sizeClass="w-8 h-8 sm:w-9 sm:h-9"
            />
          </button>
        );
      })}
    </div>
  );
}

export function EmojiPicker({
  index,
  leftIdx,
  rightIdx,
  activeSlot,
  onSelectSlot,
  onPickLeft,
  onPickRight,
  onRandomSlot,
}: EmojiPickerProps) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState(-1);
  const [onlyCompatible, setOnlyCompatible] = useState(true);

  const filtered = useMemo(
    () => searchEmojis(index, query, categoryId),
    [index, query, categoryId],
  );

  const compatibleWithLeft = useMemo(
    () => getCompatibleIndices(index, leftIdx),
    [index, leftIdx],
  );

  const leftItem = index.emojis[leftIdx];
  const rightItem = index.emojis[rightIdx];

  return (
    <section
      aria-label="Kho nguyên liệu emoji"
      className="clay-card p-4 sm:p-5 space-y-3.5"
    >
      {/* Thanh tìm kiếm tiếng Việt & lọc tương thích */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="w-4 h-4 text-[#6B5B82] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tiếng Việt hoặc dán emoji: mèo, khóc, ma, trà sữa..."
            aria-label="Tìm kiếm emoji bằng tiếng Việt hoặc dán ký tự emoji"
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[#FFFDF9] border-2 border-[#EFE4F7] text-sm font-bold text-[#2D1D42] placeholder:text-[#6B5B82] focus:border-[#C9225F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F]/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Xóa từ khóa tìm kiếm"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#F3EAF9] text-[#5B4B73] flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOnlyCompatible((v) => !v)}
          aria-pressed={onlyCompatible}
          className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold border-2 inline-flex items-center justify-center gap-1.5 cursor-pointer transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#117A70] ${
            onlyCompatible
              ? "bg-[#E6FFFB] border-[#26B5A8] text-[#0E645C]"
              : "bg-white border-[#EFE4F7] text-[#5B4B73]"
          }`}
        >
          <Filter className="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            {onlyCompatible
              ? "Đang lọc món trộn được"
              : `Hiện tất cả (${index.emojis.length})`}
          </span>
        </button>
      </div>

      {/* Thanh danh mục */}
      <div
        role="group"
        aria-label="Danh mục emoji"
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1"
      >
        {EMOJI_CATEGORIES.map((cat) => {
          const active = categoryId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={active}
              onClick={() => setCategoryId(cat.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-extrabold border-2 inline-flex items-center gap-1.5 cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D1D42] ${
                active
                  ? "bg-[#2D1D42] border-[#2D1D42] text-white"
                  : "bg-white border-[#EFE4F7] text-[#5B4B73] hover:border-[#D4C3EA]"
              }`}
            >
              <span aria-hidden="true">{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Giao diện Mobile: 1 bảng chọn theo ô đang active */}
      <div className="md:hidden space-y-2.5">
        <div className="flex items-center justify-between gap-2 bg-[#FFF4F8] border-2 border-[#FFD9E7] rounded-2xl p-1.5">
          <div
            role="group"
            aria-label="Chọn ô nguyên liệu"
            className="flex items-center gap-1.5 flex-1 min-w-0"
          >
            <button
              type="button"
              aria-pressed={activeSlot === "left"}
              onClick={() => onSelectSlot("left")}
              className={`flex-1 min-w-0 py-1.5 px-2 rounded-xl text-xs font-extrabold cursor-pointer transition whitespace-nowrap inline-flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F] ${
                activeSlot === "left"
                  ? "bg-[#C9225F] text-white shadow-sm"
                  : "text-[#5B4B73]"
              }`}
            >
              <span>Món 1</span>
              {leftItem && (
                <EmojiGraphic
                  codepoint={leftItem.codepoint}
                  char={leftItem.char}
                  alt=""
                  sizeClass="w-4 h-4 shrink-0"
                />
              )}
            </button>
            <button
              type="button"
              aria-pressed={activeSlot === "right"}
              onClick={() => onSelectSlot("right")}
              className={`flex-1 min-w-0 py-1.5 px-2 rounded-xl text-xs font-extrabold cursor-pointer transition whitespace-nowrap inline-flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F] ${
                activeSlot === "right"
                  ? "bg-[#C9225F] text-white shadow-sm"
                  : "text-[#5B4B73]"
              }`}
            >
              <span>Món 2</span>
              {rightItem && (
                <EmojiGraphic
                  codepoint={rightItem.codepoint}
                  char={rightItem.char}
                  alt=""
                  sizeClass="w-4 h-4 shrink-0"
                />
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={() => onRandomSlot(activeSlot)}
            aria-label="Quay ngẫu nhiên ô đang chọn"
            className="w-9 h-9 rounded-xl bg-white border border-[#FFD1E2] text-[#C2225D] flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F]"
          >
            <Dices className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <EmojiGrid
          items={filtered}
          selectedIdx={activeSlot === "left" ? leftIdx : rightIdx}
          compatibleSet={activeSlot === "right" ? compatibleWithLeft : null}
          onlyCompatible={activeSlot === "right" ? onlyCompatible : false}
          onPick={(idx) => {
            if (activeSlot === "left") {
              onPickLeft(idx);
            } else {
              onPickRight(idx);
            }
          }}
        />
      </div>

      {/* Giao diện Desktop: 2 bảng chọn Trái & Phải song song */}
      <div className="hidden md:grid md:grid-cols-2 gap-5">
        <div className="bg-[#FFFDFB] rounded-3xl border-2 border-[#F4E9FA] p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FFE4EE] text-[#A91A4F]">
                Nguyên liệu 1
              </span>
              {leftItem && (
                <EmojiGraphic
                  codepoint={leftItem.codepoint}
                  char={leftItem.char}
                  alt={leftItem.viLabel}
                  sizeClass="w-6 h-6"
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => onRandomSlot("left")}
              className="text-xs font-extrabold text-[#5B4B73] hover:text-[#C2225D] inline-flex items-center gap-1 cursor-pointer rounded-lg px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F]"
            >
              <Dices className="w-3.5 h-3.5" aria-hidden="true" />
              Ngẫu nhiên
            </button>
          </div>

          <EmojiGrid
            items={filtered}
            selectedIdx={leftIdx}
            compatibleSet={null}
            onlyCompatible={false}
            onPick={onPickLeft}
          />
        </div>

        <div className="bg-[#FFFDFB] rounded-3xl border-2 border-[#F4E9FA] p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#DCFAF6] text-[#0B635B]">
                Nguyên liệu 2
              </span>
              {rightItem && (
                <EmojiGraphic
                  codepoint={rightItem.codepoint}
                  char={rightItem.char}
                  alt={rightItem.viLabel}
                  sizeClass="w-6 h-6"
                />
              )}
              <span className="text-[11px] font-bold text-[#6B5B82]">
                ({compatibleWithLeft.size} món hợp)
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRandomSlot("right")}
              className="text-xs font-extrabold text-[#5B4B73] hover:text-[#0B635B] inline-flex items-center gap-1 cursor-pointer rounded-lg px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B635B]"
            >
              <Dices className="w-3.5 h-3.5" aria-hidden="true" />
              Ngẫu nhiên
            </button>
          </div>

          <EmojiGrid
            items={filtered}
            selectedIdx={rightIdx}
            compatibleSet={compatibleWithLeft}
            onlyCompatible={onlyCompatible}
            onPick={onPickRight}
          />
        </div>
      </div>
    </section>
  );
}
