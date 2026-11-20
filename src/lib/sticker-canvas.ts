"use client";

export type MemeBgStyle = "transparent" | "berry" | "butter" | "mint" | "grape";
export type MemeTextStyle = "classic" | "berry" | "mango" | "mint";
export type MemeTextPosition = "bottom" | "top";

export interface MemeConfig {
  enabled: boolean;
  whiteOutline: boolean;
  text: string;
  textPosition: MemeTextPosition;
  textStyle: MemeTextStyle;
  bgStyle: MemeBgStyle;
}

export const DEFAULT_MEME_CONFIG: MemeConfig = {
  enabled: false,
  whiteOutline: true,
  text: "",
  textPosition: "bottom",
  textStyle: "classic",
  bgStyle: "transparent",
};

export const BG_PRESETS: Array<{
  id: MemeBgStyle;
  label: string;
  swatch: string;
  gradient?: [string, string];
}> = [
  { id: "transparent", label: "Trong suốt", swatch: "transparent" },
  {
    id: "berry",
    label: "Kẹo Dâu",
    swatch: "#FFD6E5",
    gradient: ["#FFE8F0", "#FFC2D9"],
  },
  {
    id: "butter",
    label: "Bơ Kem",
    swatch: "#FFF1C9",
    gradient: ["#FFF8E1", "#FFE39E"],
  },
  {
    id: "mint",
    label: "Bạc Hà",
    swatch: "#D3F8F3",
    gradient: ["#E6FFFB", "#B7F2EA"],
  },
  {
    id: "grape",
    label: "Nho Ngọt",
    swatch: "#E7E0FF",
    gradient: ["#F2EEFF", "#D6C9FF"],
  },
];

export const TEXT_PRESETS: Array<{
  id: MemeTextStyle;
  label: string;
  fill: string;
  stroke: string;
}> = [
  { id: "classic", label: "Kinh điển", fill: "#FFFFFF", stroke: "#1E1B2E" },
  { id: "berry", label: "Kẹo dâu", fill: "#FF5C93", stroke: "#FFFFFF" },
  { id: "mango", label: "Nắng vàng", fill: "#FFD23F", stroke: "#4A2511" },
  { id: "mint", label: "Bạc hà", fill: "#2EC4B6", stroke: "#FFFFFF" },
];

const MAX_IMAGE_CACHE = 40;
const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadSameOriginSticker(proxyUrl: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(proxyUrl);
  if (cached) {
    // Refresh LRU order
    imageCache.delete(proxyUrl);
    imageCache.set(proxyUrl, cached);
    return cached;
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      imageCache.delete(proxyUrl);
      reject(new Error("Không tải được ảnh sticker"));
    };
    img.src = proxyUrl;
  });

  if (imageCache.size >= MAX_IMAGE_CACHE) {
    const oldestKey = imageCache.keys().next().value;
    if (oldestKey !== undefined) imageCache.delete(oldestKey);
  }
  imageCache.set(proxyUrl, promise);
  return promise;
}

function getCanvasFontStack(): string {
  if (typeof document !== "undefined") {
    const balooVar = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-baloo")
      .trim();
    const bodyFont = getComputedStyle(document.body).fontFamily.trim();
    if (balooVar) {
      return `${balooVar}, ${bodyFont || "system-ui, sans-serif"}`;
    }
    if (bodyFont) {
      return `'Baloo 2', ${bodyFont}`;
    }
  }
  return `'Baloo 2', 'Nunito', system-ui, sans-serif`;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

function splitLongWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  maxWidth: number,
): string[] {
  const chars = Array.from(word);
  const chunks: string[] = [];
  let part = "";

  for (const ch of chars) {
    const candidate = part + ch;
    if (part && ctx.measureText(candidate).width > maxWidth) {
      chunks.push(part);
      part = ch;
    } else {
      part = candidate;
    }
  }
  if (part) chunks.push(part);
  return chunks;
}

function wrapMemeText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const clean = text.trim();
  if (!clean) return [];

  const rawWords = clean.split(/\s+/);
  const words: string[] = [];
  for (const word of rawWords) {
    if (ctx.measureText(word).width > maxWidth) {
      words.push(...splitLongWord(ctx, word, maxWidth));
    } else {
      words.push(word);
    }
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  if (lines.length <= 2) return lines;
  return [lines[0], lines.slice(1).join(" ")];
}

export async function renderStickerToCanvas(
  canvas: HTMLCanvasElement,
  proxyUrl: string,
  config: MemeConfig,
  size: number = 512,
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) return;

  const hasText = config.enabled && config.text.trim().length > 0;
  const fontStack = getCanvasFontStack();

  if (typeof document !== "undefined" && "fonts" in document) {
    if (hasText) {
      try {
        await document.fonts.load('800 54px "Baloo 2"', config.text);
      } catch {
        // Fallback silently to ready/system font
      }
    }
    await document.fonts.ready;
  }
  if (signal?.aborted) return;

  const img = await loadSameOriginSticker(proxyUrl);
  if (signal?.aborted) return;

  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, size, size);

  // 1. Nền tùy chọn
  if (config.bgStyle !== "transparent") {
    const preset = BG_PRESETS.find((b) => b.id === config.bgStyle);
    if (preset?.gradient) {
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, preset.gradient[0]);
      grad.addColorStop(1, preset.gradient[1]);
      ctx.save();
      drawRoundedRectPath(ctx, 12, 12, size - 24, size - 24, 68);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.stroke();
      ctx.restore();
    }
  }

  const padding = Math.round(size * (config.whiteOutline ? 0.12 : 0.08));
  const textReserve = hasText ? Math.round(size * 0.17) : 0;
  const maxStickerW = size - padding * 2;
  const maxStickerH = size - padding * 2 - textReserve;
  const stickerSize = Math.min(maxStickerW, maxStickerH);

  const drawX = Math.round((size - stickerSize) / 2);
  let drawY = Math.round((size - stickerSize) / 2);
  if (hasText) {
    drawY =
      config.textPosition === "bottom"
        ? Math.round((size - textReserve - stickerSize) / 2) + 4
        : Math.round(textReserve + (size - textReserve - stickerSize) / 2) - 4;
  }

  // 2. Viền sticker trắng 360 độ (Die-cut) — tách shadow ra 1 lần vẽ duy nhất để viền trắng tinh & mượt trên mobile
  if (config.enabled && config.whiteOutline) {
    const outlineRadius = Math.max(8, Math.round(size * 0.028));
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = stickerSize;
    maskCanvas.height = stickerSize;
    const mCtx = maskCanvas.getContext("2d");

    const outlineDim = stickerSize + outlineRadius * 2;
    const outlineCanvas = document.createElement("canvas");
    outlineCanvas.width = outlineDim;
    outlineCanvas.height = outlineDim;
    const oCtx = outlineCanvas.getContext("2d");

    if (mCtx && oCtx) {
      mCtx.drawImage(img, 0, 0, stickerSize, stickerSize);
      mCtx.globalCompositeOperation = "source-in";
      mCtx.fillStyle = "#FFFFFF";
      mCtx.fillRect(0, 0, stickerSize, stickerSize);

      const steps = 24;
      for (let i = 0; i < steps; i++) {
        const angle = (i * Math.PI * 2) / steps;
        const ox = Math.cos(angle) * outlineRadius;
        const oy = Math.sin(angle) * outlineRadius;
        oCtx.drawImage(maskCanvas, outlineRadius + ox, outlineRadius + oy);
      }
      oCtx.drawImage(maskCanvas, outlineRadius, outlineRadius);

      ctx.save();
      ctx.shadowColor = "rgba(45, 29, 66, 0.22)";
      ctx.shadowBlur = Math.round(size * 0.026);
      ctx.shadowOffsetY = Math.round(size * 0.012);
      ctx.drawImage(outlineCanvas, drawX - outlineRadius, drawY - outlineRadius);
      ctx.restore();
    }
  }

  // 3. Ảnh sticker gốc
  ctx.drawImage(img, drawX, drawY, stickerSize, stickerSize);

  // 4. Chữ meme tiếng Việt
  if (hasText) {
    const style =
      TEXT_PRESETS.find((t) => t.id === config.textStyle) ?? TEXT_PRESETS[0];
    const maxTextWidth = size * 0.86;
    const minFontSize = Math.round(size * 0.052);
    let fontSize = Math.round(size * 0.105);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;

    let lines: string[] = [];
    while (fontSize > minFontSize) {
      ctx.font = `800 ${fontSize}px ${fontStack}`;
      lines = wrapMemeText(ctx, config.text, maxTextWidth);
      const widest = Math.max(
        0,
        ...lines.map((line) => ctx.measureText(line).width),
      );
      if (widest <= maxTextWidth && lines.length <= 2) break;
      fontSize -= 4;
    }

    // Đồng bộ lại ctx.font sau vòng lặp để khớp tuyệt đối với lineHeight/lineWidth
    ctx.font = `800 ${fontSize}px ${fontStack}`;
    lines = wrapMemeText(ctx, config.text, maxTextWidth);

    const lineHeight = fontSize * 1.14;
    const blockHeight = lines.length * lineHeight;
    const centerY =
      config.textPosition === "bottom"
        ? size - Math.round(size * 0.115) - (blockHeight - lineHeight) / 2
        : Math.round(size * 0.115) + (blockHeight - lineHeight) / 2;

    ctx.lineWidth = Math.max(8, Math.round(fontSize * 0.24));
    ctx.strokeStyle = style.stroke;
    ctx.fillStyle = style.fill;

    lines.forEach((line, i) => {
      const y = centerY + i * lineHeight;
      ctx.save();
      ctx.shadowColor = "rgba(30, 27, 46, 0.24)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      ctx.strokeText(line, size / 2, y, maxTextWidth);
      ctx.restore();
      ctx.fillText(line, size / 2, y, maxTextWidth);
    });
  }
}

export async function renderStickerBlob(
  proxyUrl: string,
  config: MemeConfig,
  size: number = 512,
): Promise<Blob> {
  const needsCanvas =
    config.enabled &&
    (config.whiteOutline ||
      config.text.trim().length > 0 ||
      config.bgStyle !== "transparent");

  if (!needsCanvas) {
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error("Không tải được PNG sticker");
    return await res.blob();
  }

  const canvas = document.createElement("canvas");
  await renderStickerToCanvas(canvas, proxyUrl, config, size);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Không xuất được ảnh PNG"));
      },
      "image/png",
      1,
    );
  });
}

export async function copyStickerToClipboard(
  proxyUrl: string,
  config: MemeConfig,
): Promise<"copied" | "unsupported"> {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof navigator.clipboard.write !== "function" ||
    typeof ClipboardItem === "undefined"
  ) {
    return "unsupported";
  }

  // Truyền Promise<Blob> trực tiếp vào ClipboardItem để giữ user-gesture trên Safari iOS
  const blobPromise = renderStickerBlob(proxyUrl, config, 512);
  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": blobPromise,
    }),
  ]);
  return "copied";
}

export function supportsFileShare(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  if (typeof navigator.canShare !== "function" || typeof File === "undefined") {
    return false;
  }
  try {
    const probe = new File([new Uint8Array(1)], "sticker.png", {
      type: "image/png",
    });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export async function downloadStickerPng(
  proxyUrl: string,
  config: MemeConfig,
  filename: string,
): Promise<void> {
  const blob = await renderStickerBlob(proxyUrl, config, 512);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function shareSticker(
  proxyUrl: string,
  config: MemeConfig,
  filename: string,
  title: string,
): Promise<"shared" | "unsupported" | "cancelled"> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return "unsupported";
  }

  const blob = await renderStickerBlob(proxyUrl, config, 512);
  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.canShare && !navigator.canShare({ files: [file] })) {
    return "unsupported";
  }

  try {
    await navigator.share({
      title,
      files: [file],
    });
    return "shared";
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "name" in err &&
      (err as { name?: unknown }).name === "AbortError"
    ) {
      return "cancelled";
    }
    throw err;
  }
}
