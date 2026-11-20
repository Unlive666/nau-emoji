"use client";

import { useState } from "react";
import { getNotoEmojiSvgUrl } from "@/lib/kitchen-engine";

interface EmojiGraphicProps {
  codepoint: string;
  char: string;
  alt: string;
  sizeClass?: string;
  priority?: boolean;
}

function getFallbackFontClass(sizeClass: string): string {
  if (sizeClass.includes("w-14") || sizeClass.includes("w-12")) {
    return "text-4xl sm:text-5xl";
  }
  if (sizeClass.includes("w-8") || sizeClass.includes("w-9")) {
    return "text-2xl sm:text-3xl";
  }
  return "text-base";
}

export function EmojiGraphic({
  codepoint,
  char,
  alt,
  sizeClass = "w-8 h-8",
  priority = false,
}: EmojiGraphicProps) {
  const [failedCp, setFailedCp] = useState<string | null>(null);
  const failed = failedCp === codepoint;

  if (failed) {
    return (
      <span
        className={`inline-flex items-center justify-center leading-none select-none ${sizeClass} ${getFallbackFontClass(sizeClass)}`}
        role="img"
        aria-label={alt}
      >
        {char}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getNotoEmojiSvgUrl(codepoint)}
      alt={alt}
      width={64}
      height={64}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      onError={() => setFailedCp(codepoint)}
      className={`object-contain select-none pointer-events-none ${sizeClass}`}
    />
  );
}
