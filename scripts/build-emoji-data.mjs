import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import zlib from "node:zlib";

const METADATA_URL =
  "https://raw.githubusercontent.com/xsalazar/emoji-kitchen-backend/main/app/metadata.json";
const KEYWORDS_URL =
  "https://raw.githubusercontent.com/xsalazar/emoji-kitchen-backend/main/app/keywords.json";

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, ".cache");
const CACHE_METADATA = path.join(CACHE_DIR, "metadata.json");
const CACHE_KEYWORDS = path.join(CACHE_DIR, "keywords.json");
const OUT_DIR = path.join(ROOT, "public", "data");
const OUT_FILE = path.join(OUT_DIR, "kitchen-v1.json");

// Categories mapped to compact numeric IDs:
// 0: smileys & emotion, 1: animals & nature, 2: food & drink, 3: objects & symbols, 4: activities & travel & people
const CATEGORY_MAP = new Map([
  ["smileys & emotion", 0],
  ["animals & nature", 1],
  ["food & drink", 2],
  ["objects", 3],
  ["symbols", 3],
  ["flags", 3],
  ["activities", 4],
  ["travel & places", 4],
  ["people & body", 0],
]);

function mapCategory(rawCategory) {
  if (!rawCategory) return 3;
  const normalized = String(rawCategory).toLowerCase().trim();
  return CATEGORY_MAP.get(normalized) ?? 3;
}

/**
 * Format a codepoint string like "2764-fe0f" into gstatic path segment "u2764-ufe0f"
 */
export function formatGstaticCodepoint(cp) {
  return cp
    .split("-")
    .map((part) => `u${part}`)
    .join("-");
}

export function buildGstaticUrl(date, urlLeft, urlRight) {
  return `https://www.gstatic.com/android/keyboard/emojikitchen/${date}/${urlLeft}/${urlLeft}_${urlRight}.png`;
}

async function ensureDownloaded(url, destPath, label) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
    console.log(`[cache] Dùng lại ${label}: ${destPath}`);
    return;
  }
  console.log(`[fetch] Đang tải ${label} từ GitHub...`);
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) {
    throw new Error(`Không thể tải ${label}: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
  console.log(`[saved] ${label}: ${(buf.length / (1024 * 1024)).toFixed(2)} MB`);
}

async function main() {
  await ensureDownloaded(KEYWORDS_URL, CACHE_KEYWORDS, "keywords.json");
  await ensureDownloaded(METADATA_URL, CACHE_METADATA, "metadata.json");

  console.log("[parse] Đang đọc dữ liệu...");
  const keywordsJson = JSON.parse(fs.readFileSync(CACHE_KEYWORDS, "utf8"));
  const metadataJson = JSON.parse(fs.readFileSync(CACHE_METADATA, "utf8"));

  const supported = metadataJson.knownSupportedEmoji ?? [];
  const data = metadataJson.data ?? {};
  const kwData = keywordsJson.data ?? {};

  // Build stable emoji list sorted by gBoardOrder then supported index
  const emojiList = supported
    .filter((cp) => Boolean(data[cp]))
    .map((cp) => {
      const entry = data[cp];
      const kwEntry = kwData[cp];
      const order = typeof entry.gBoardOrder === "number" ? entry.gBoardOrder : 9999;
      const alt = String(entry.alt || kwEntry?.alt || cp);
      const catId = mapCategory(kwEntry?.category);
      return { cp, order, alt, catId };
    });

  emojiList.sort((a, b) => a.order - b.order);

  const cpToIdx = new Map();
  emojiList.forEach((item, idx) => cpToIdx.set(item.cp, idx));

  const dates = [];
  const dateToIdx = new Map();
  const getDateIdx = (dateStr) => {
    let idx = dateToIdx.get(dateStr);
    if (idx === undefined) {
      idx = dates.length;
      dates.push(dateStr);
      dateToIdx.set(dateStr, idx);
    }
    return idx;
  };

  // Deduplicate unordered pairs {minIdx, maxIdx} while preserving exact URL direction
  // Key: "minIdx:maxIdx" -> value: { dateIdx, urlOrder: 0 (min_max) | 1 (max_min), exceptionSuffix? }
  const pairMap = new Map();
  const exceptions = {};
  let totalLatestSeen = 0;
  let urlMismatches = 0;

  for (const leftItem of emojiList) {
    const leftIdx = cpToIdx.get(leftItem.cp);
    const entry = data[leftItem.cp];
    const combinations = entry?.combinations ?? {};

    for (const [rightCp, comboArr] of Object.entries(combinations)) {
      const rightIdx = cpToIdx.get(rightCp);
      if (rightIdx === undefined || !Array.isArray(comboArr)) continue;

      // Prefer isLatest: true, fallback to last item
      const latest = comboArr.find((c) => c.isLatest) ?? comboArr[comboArr.length - 1];
      if (!latest || !latest.gStaticUrl) continue;

      totalLatestSeen++;
      const minIdx = Math.min(leftIdx, rightIdx);
      const maxIdx = Math.max(leftIdx, rightIdx);
      const pairKey = `${minIdx}:${maxIdx}`;

      if (pairMap.has(pairKey)) continue;

      const minCp = emojiList[minIdx].cp;
      const maxCp = emojiList[maxIdx].cp;
      const minSeg = formatGstaticCodepoint(minCp);
      const maxSeg = formatGstaticCodepoint(maxCp);
      const dateStr = String(latest.date || "");
      const dateIdx = getDateIdx(dateStr);

      const urlMinMax = buildGstaticUrl(dateStr, minSeg, maxSeg);
      const urlMaxMin = buildGstaticUrl(dateStr, maxSeg, minSeg);

      if (latest.gStaticUrl === urlMinMax) {
        pairMap.set(pairKey, {
          minIdx,
          maxIdx,
          dateIdx,
          rev: 0,
          originalUrl: latest.gStaticUrl,
        });
      } else if (latest.gStaticUrl === urlMaxMin) {
        pairMap.set(pairKey, {
          minIdx,
          maxIdx,
          dateIdx,
          rev: 1,
          originalUrl: latest.gStaticUrl,
        });
      } else {
        // Store exception relative suffix after gstatic prefix
        const prefix = "https://www.gstatic.com/android/keyboard/emojikitchen/";
        if (latest.gStaticUrl.startsWith(prefix)) {
          exceptions[pairKey] = latest.gStaticUrl.slice(prefix.length);
          pairMap.set(pairKey, {
            minIdx,
            maxIdx,
            dateIdx,
            rev: 2,
            originalUrl: latest.gStaticUrl,
          });
        } else {
          urlMismatches++;
        }
      }
    }
  }

  // Group combos by minIdx for ultra-compact storage:
  // combos[minIdx] = "maxIdx:dateIdx[:r|:e],..."
  const combosByMin = Array.from({ length: emojiList.length }, () => []);
  for (const { minIdx, maxIdx, dateIdx, rev } of pairMap.values()) {
    const suffix = rev === 1 ? ":r" : rev === 2 ? ":e" : "";
    combosByMin[minIdx].push(`${maxIdx}:${dateIdx}${suffix}`);
  }

  const output = {
    v: 1,
    dates,
    emojis: emojiList.map((e) => [e.cp, e.order, e.alt, e.catId]),
    combos: combosByMin.map((arr) => arr.join(",")),
    exceptions,
  };

  // Verify 100% URL reconstruction accuracy on every stored pair
  let verifiedPairs = 0;
  for (let minIdx = 0; minIdx < output.combos.length; minIdx++) {
    const row = output.combos[minIdx];
    if (!row) continue;
    const minSeg = formatGstaticCodepoint(output.emojis[minIdx][0]);
    for (const token of row.split(",")) {
      const parts = token.split(":");
      const maxIdx = Number(parts[0]);
      const dateIdx = Number(parts[1]);
      const flag = parts[2];
      const maxSeg = formatGstaticCodepoint(output.emojis[maxIdx][0]);
      const dateStr = output.dates[dateIdx];

      let reconstructed;
      if (flag === "e") {
        reconstructed =
          "https://www.gstatic.com/android/keyboard/emojikitchen/" +
          output.exceptions[`${minIdx}:${maxIdx}`];
      } else if (flag === "r") {
        reconstructed = buildGstaticUrl(dateStr, maxSeg, minSeg);
      } else {
        reconstructed = buildGstaticUrl(dateStr, minSeg, maxSeg);
      }

      const pairKey = `${minIdx}:${maxIdx}`;
      const expected = pairMap.get(pairKey)?.originalUrl;
      if (!expected || reconstructed !== expected) {
        throw new Error(
          `URL tái tạo không khớp gốc tại ${pairKey}: got=${reconstructed} expected=${expected}`,
        );
      }
      verifiedPairs++;
    }
  }

  if (verifiedPairs !== pairMap.size) {
    throw new Error(
      `Số cặp xác minh (${verifiedPairs}) không khớp tổng cặp (${pairMap.size})`,
    );
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const jsonStr = JSON.stringify(output);
  fs.writeFileSync(OUT_FILE, jsonStr, "utf8");
  const gzipSize = zlib.gzipSync(jsonStr, { level: 9 }).length;

  console.log("=== HOÀN TẤT NÉN DỮ LIỆU ===");
  console.log(`Tổng số emoji gốc hỗ trợ : ${emojiList.length}`);
  console.log(`Tổng lượt latest quét qua : ${totalLatestSeen}`);
  console.log(`Tổng số cặp duy nhất      : ${verifiedPairs}`);
  console.log(`Số ngoại lệ URL           : ${Object.keys(exceptions).length}`);
  console.log(`Số URL lỗi/lệch           : ${urlMismatches}`);
  console.log(`Kích thước JSON thô       : ${(Buffer.byteLength(jsonStr) / 1024).toFixed(1)} KB`);
  console.log(`Kích thước JSON gzip      : ${(gzipSize / 1024).toFixed(1)} KB`);

  if (urlMismatches > 0) {
    process.exitCode = 1;
  }
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
