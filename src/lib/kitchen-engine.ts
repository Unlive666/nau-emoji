import {
  getEmojiVietnameseName,
  normalizeVietnamese,
  VI_EMOJI_KEYWORDS,
} from "./vietnamese-keywords";

export interface CompactKitchenData {
  v: number;
  dates: string[];
  // [codepoint, gBoardOrder, altEn, categoryId]
  emojis: Array<[string, number, string, number]>;
  // combos[minIdx] = "maxIdx:dateIdx[:r|:e],..."
  combos: string[];
  exceptions: Record<string, string>;
}

export interface EmojiItem {
  index: number;
  codepoint: string;
  char: string;
  order: number;
  alt: string;
  viLabel: string;
  categoryId: number;
  searchBlob: string;
}

export interface CombinationResult {
  left: EmojiItem;
  right: EmojiItem;
  gStaticUrl: string;
  proxyUrl: string;
  date: string;
  filename: string;
}

export interface KitchenIndex {
  emojis: EmojiItem[];
  cpToIndex: Map<string, number>;
  // adjacency[idx] -> Set of compatible partner indices
  adjacency: Array<Set<number>>;
  // pairLookup key `${min}:${max}` -> { dateStr, rev: 0 | 1 | 2 }
  pairLookup: Map<string, { dateStr: string; rev: 0 | 1 | 2 }>;
  exceptions: Record<string, string>;
  totalPairs: number;
}

export function toPrintableEmoji(codepoint: string): string {
  try {
    return String.fromCodePoint(
      ...codepoint.split("-").map((part) => parseInt(part, 16)),
    );
  } catch {
    return "❓";
  }
}

export function formatGstaticSegment(codepoint: string): string {
  return codepoint
    .split("-")
    .map((part) => `u${part}`)
    .join("-");
}

export function getNotoEmojiSvgUrl(codepoint: string): string {
  const clean = codepoint
    .split("-")
    .filter((part) => part !== "fe0f")
    .map((part) => (part.length < 4 ? part.padStart(4, "0") : part))
    .join("_");
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${clean}/emoji.svg`;
}

export function buildKitchenIndex(raw: CompactKitchenData): KitchenIndex {
  const cpToIndex = new Map<string, number>();

  const emojis: EmojiItem[] = raw.emojis.map(([cp, order, alt, catId], index) => {
    cpToIndex.set(cp, index);
    const viWords = VI_EMOJI_KEYWORDS[cp] ?? [];
    const altWords = alt.replace(/[_-]+/g, " ");
    const char = toPrintableEmoji(cp);
    const searchBlob = normalizeVietnamese(`${viWords.join(" ")} ${altWords}`);
    const viLabel = getEmojiVietnameseName(cp, alt);
    return {
      index,
      codepoint: cp,
      char,
      order,
      alt,
      viLabel,
      categoryId: catId,
      searchBlob,
    };
  });

  const adjacency = Array.from({ length: emojis.length }, () => new Set<number>());
  const pairLookup = new Map<string, { dateStr: string; rev: 0 | 1 | 2 }>();

  for (let minIdx = 0; minIdx < raw.combos.length; minIdx++) {
    const row = raw.combos[minIdx];
    if (!row) continue;

    for (const token of row.split(",")) {
      const parts = token.split(":");
      const maxIdx = Number(parts[0]);
      const dateIdx = Number(parts[1]);
      const flag = parts[2];
      const rev: 0 | 1 | 2 = flag === "e" ? 2 : flag === "r" ? 1 : 0;
      const dateStr = raw.dates[dateIdx] ?? "";

      adjacency[minIdx].add(maxIdx);
      adjacency[maxIdx].add(minIdx);
      pairLookup.set(`${minIdx}:${maxIdx}`, { dateStr, rev });
    }
  }

  return {
    emojis,
    cpToIndex,
    adjacency,
    pairLookup,
    exceptions: raw.exceptions ?? {},
    totalPairs: pairLookup.size,
  };
}

export function lookupCombination(
  index: KitchenIndex,
  leftIdx: number,
  rightIdx: number,
): CombinationResult | null {
  const left = index.emojis[leftIdx];
  const right = index.emojis[rightIdx];
  if (!left || !right) return null;

  const minIdx = Math.min(leftIdx, rightIdx);
  const maxIdx = Math.max(leftIdx, rightIdx);
  const key = `${minIdx}:${maxIdx}`;
  const hit = index.pairLookup.get(key);
  if (!hit) return null;

  let gStaticUrl: string;
  let proxyUrl: string;

  if (hit.rev === 2) {
    const suffix = index.exceptions[key];
    if (!suffix) return null;
    gStaticUrl = `https://www.gstatic.com/android/keyboard/emojikitchen/${suffix}`;
    proxyUrl = `/api/sticker?p=${encodeURIComponent(suffix)}`;
  } else {
    const minSeg = formatGstaticSegment(index.emojis[minIdx].codepoint);
    const maxSeg = formatGstaticSegment(index.emojis[maxIdx].codepoint);
    const urlLeft = hit.rev === 1 ? maxSeg : minSeg;
    const urlRight = hit.rev === 1 ? minSeg : maxSeg;
    gStaticUrl = `https://www.gstatic.com/android/keyboard/emojikitchen/${hit.dateStr}/${urlLeft}/${urlLeft}_${urlRight}.png`;
    proxyUrl = `/api/sticker?d=${encodeURIComponent(hit.dateStr)}&l=${encodeURIComponent(urlLeft)}&r=${encodeURIComponent(urlRight)}`;
  }

  return {
    left,
    right,
    gStaticUrl,
    proxyUrl,
    date: hit.dateStr,
    filename: `nau-emoji-${left.alt}-${right.alt}.png`,
  };
}

export function getCompatibleIndices(
  index: KitchenIndex,
  emojiIdx: number,
): Set<number> {
  return index.adjacency[emojiIdx] ?? new Set<number>();
}

export function pickRandomCombo(
  index: KitchenIndex,
  fixedLeftIdx?: number,
  excludeIdx?: number,
): { leftIdx: number; rightIdx: number } {
  if (
    fixedLeftIdx !== undefined &&
    index.adjacency[fixedLeftIdx] &&
    index.adjacency[fixedLeftIdx].size > 0
  ) {
    const allPartners = Array.from(index.adjacency[fixedLeftIdx]);
    const pool =
      excludeIdx !== undefined && allPartners.length > 1
        ? allPartners.filter((p) => p !== excludeIdx)
        : allPartners;
    const rightIdx = pool[Math.floor(Math.random() * pool.length)];
    return { leftIdx: fixedLeftIdx, rightIdx };
  }

  const validLefts = index.emojis.filter(
    (e) => (index.adjacency[e.index]?.size ?? 0) > 0,
  );
  if (validLefts.length === 0) {
    return { leftIdx: 0, rightIdx: 0 };
  }
  const leftPool =
    excludeIdx !== undefined && validLefts.length > 1
      ? validLefts.filter((e) => e.index !== excludeIdx)
      : validLefts;
  const left = leftPool[Math.floor(Math.random() * leftPool.length)];
  const partners = Array.from(index.adjacency[left.index]);
  const rightIdx = partners[Math.floor(Math.random() * partners.length)];
  return { leftIdx: left.index, rightIdx };
}

function stripVariationSelector(input: string): string {
  return input.replace(/\uFE0F/g, "");
}

export function searchEmojis(
  index: KitchenIndex,
  query: string,
  categoryId: number = -1,
): EmojiItem[] {
  const trimmed = query.trim();
  const normQuery = normalizeVietnamese(trimmed);
  const tokens = normQuery ? normQuery.split(" ") : [];
  const cleanQuery = trimmed ? stripVariationSelector(trimmed) : "";

  return index.emojis.filter((item) => {
    if (categoryId !== -1 && item.categoryId !== categoryId) {
      return false;
    }
    if (!trimmed) return true;

    const cleanChar = stripVariationSelector(item.char);
    if (
      trimmed.includes(item.char) ||
      (cleanChar.length > 0 && cleanQuery.includes(cleanChar))
    ) {
      return true;
    }

    if (tokens.length === 0) return false;
    return tokens.every((tok) => item.searchBlob.includes(tok));
  });
}
