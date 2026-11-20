"use client";

import { Flame } from "lucide-react";
import { HOT_COMBOS, type HotCombo } from "@/lib/vietnamese-keywords";
import { toPrintableEmoji } from "@/lib/kitchen-engine";
import { EmojiGraphic } from "./EmojiGraphic";

interface HotCombosBarProps {
  onSelectCombo: (combo: HotCombo) => void;
  activeLeftCp?: string;
  activeRightCp?: string;
}

export function HotCombosBar({
  onSelectCombo,
  activeLeftCp,
  activeRightCp,
}: HotCombosBarProps) {
  return (
    <section aria-label="Combo Hot Gen Z">
      <div className="flex items-center gap-2 mb-2.5 px-1">
        <span className="inline-flex items-center gap-1 text-sm font-extrabold text-[#C2225D]">
          <Flame className="w-4 h-4 fill-current" aria-hidden="true" />
          <span>Món Hot Hôm Nay</span>
        </span>
        <span className="text-xs font-bold text-[#6B5B82]">
          (Chạm để nấu thử liền)
        </span>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-2">
        {HOT_COMBOS.map((item) => {
          const isCurrent =
            (activeLeftCp === item.leftCp && activeRightCp === item.rightCp) ||
            (activeLeftCp === item.rightCp && activeRightCp === item.leftCp);
          const leftChar = toPrintableEmoji(item.leftCp);
          const rightChar = toPrintableEmoji(item.rightCp);

          return (
            <button
              key={`${item.leftCp}-${item.rightCp}`}
              type="button"
              aria-pressed={isCurrent}
              aria-label={`Nấu món hot: ${item.title}`}
              onClick={() => onSelectCombo(item)}
              className={`shrink-0 px-3.5 py-2 rounded-2xl border-2 flex items-center gap-2 text-left transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9225F] ${
                isCurrent
                  ? "bg-[#FFE5EF] border-[#C9225F] shadow-sm"
                  : "bg-white/90 border-[#F2E7FA] hover:border-[#FFB2CE]"
              }`}
            >
              <span
                aria-hidden="true"
                className="inline-flex items-center gap-0.5 select-none shrink-0"
              >
                <EmojiGraphic
                  codepoint={item.leftCp}
                  char={leftChar}
                  alt=""
                  sizeClass="w-5 h-5"
                />
                <span className="text-xs font-black text-[#6B5B82]">+</span>
                <EmojiGraphic
                  codepoint={item.rightCp}
                  char={rightChar}
                  alt=""
                  sizeClass="w-5 h-5"
                />
              </span>
              <span className="text-xs font-extrabold text-[#2D1D42] whitespace-nowrap">
                {item.title}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
