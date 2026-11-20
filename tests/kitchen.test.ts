import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { NextRequest } from "next/server";
import {
  buildKitchenIndex,
  getCompatibleIndices,
  getNotoEmojiSvgUrl,
  lookupCombination,
  pickRandomCombo,
  searchEmojis,
  toPrintableEmoji,
  type CompactKitchenData,
} from "../src/lib/kitchen-engine";
import {
  HOT_COMBOS,
  VI_EMOJI_KEYWORDS,
  normalizeVietnamese,
} from "../src/lib/vietnamese-keywords";
import { buildValidatedStickerUrl } from "../src/lib/sticker-url";
import { GET as getStickerRoute } from "../src/app/api/sticker/route";

const dataPath = path.join(process.cwd(), "public", "data", "kitchen-v1.json");
const rawData = JSON.parse(fs.readFileSync(dataPath, "utf8")) as CompactKitchenData;
const index = buildKitchenIndex(rawData);

test("kitchen-v1.json loads full compressed dataset with 100% VI keyword coverage", () => {
  assert.equal(index.emojis.length, 619);
  assert.equal(index.totalPairs, 147000);

  for (const emoji of index.emojis) {
    assert.ok(
      index.adjacency[emoji.index].size > 0,
      `Emoji cô lập không có cặp: ${emoji.codepoint}`,
    );
    assert.ok(
      Array.isArray(VI_EMOJI_KEYWORDS[emoji.codepoint]) &&
        VI_EMOJI_KEYWORDS[emoji.codepoint].length > 0,
      `Thiếu từ khóa tiếng Việt cho ${emoji.codepoint}`,
    );
  }

  // Không lộ từ khóa nhạy cảm hoặc thương hiệu nguồn
  const allViWords = Object.values(VI_EMOJI_KEYWORDS)
    .flat()
    .map((w) => w.toLowerCase());
  for (const forbidden of ["google", "gboard", "pixel", "emoji kitchen", "cười ỉa"]) {
    assert.equal(
      allViWords.some((w) => w.includes(forbidden)),
      false,
      `Không được chứa từ khóa cấm: ${forbidden}`,
    );
  }
});

test("all 18 HOT_COMBOS resolve to valid stickers and pass URL whitelist", () => {
  assert.equal(HOT_COMBOS.length, 18);

  for (const hot of HOT_COMBOS) {
    const leftIdx = index.cpToIndex.get(hot.leftCp);
    const rightIdx = index.cpToIndex.get(hot.rightCp);
    assert.notEqual(leftIdx, undefined, `Thiếu leftCp trong HOT_COMBOS: ${hot.leftCp}`);
    assert.notEqual(rightIdx, undefined, `Thiếu rightCp trong HOT_COMBOS: ${hot.rightCp}`);

    const combo = lookupCombination(index, leftIdx!, rightIdx!);
    assert.ok(combo, `HOT_COMBO không hợp lệ: ${hot.leftCp} + ${hot.rightCp}`);
    assert.ok(combo.proxyUrl.startsWith("/api/sticker?"));

    const qs = combo.proxyUrl.slice("/api/sticker?".length);
    const validated = buildValidatedStickerUrl(new URLSearchParams(qs));
    assert.equal(validated, combo.gStaticUrl);
  }
});

test("lookupCombination resolves famous combos symmetrically and handles rev 1/2 & null edges", () => {
  const pairs: Array<[string, string]> = [
    ["1f600", "2615"], // 😀 + ☕
    ["1f47b", "1f920"], // 👻 + 🤠
    ["1f480", "1f973"], // 💀 + 🥳
    ["1f431", "1f62d"], // 🐱 + 😭
  ];

  for (const [a, b] of pairs) {
    const ia = index.cpToIndex.get(a);
    const ib = index.cpToIndex.get(b);
    assert.notEqual(ia, undefined, `Thiếu codepoint ${a}`);
    assert.notEqual(ib, undefined, `Thiếu codepoint ${b}`);

    const c1 = lookupCombination(index, ia!, ib!);
    const c2 = lookupCombination(index, ib!, ia!);
    assert.ok(c1, `Không tìm thấy combo ${a}+${b}`);
    assert.ok(c2, `Không tìm thấy combo ${b}+${a}`);
    assert.equal(c1.gStaticUrl, c2.gStaticUrl);
    assert.match(
      c1.gStaticUrl,
      /^https:\/\/www\.gstatic\.com\/android\/keyboard\/emojikitchen\/\d{8}\/u.+\/u.+_u.+\.png$/,
    );
    assert.ok(c1.proxyUrl.startsWith("/api/sticker?"));
  }

  // Kiểm tra cặp rev=1 (:r) thực tế trong dataset
  let testedRev1 = false;
  for (const [key, entry] of index.pairLookup) {
    if (entry.rev === 1) {
      const [minS, maxS] = key.split(":");
      const minIdx = Number(minS);
      const maxIdx = Number(maxS);
      const hit = lookupCombination(index, minIdx, maxIdx);
      assert.ok(hit);
      const qs = hit.proxyUrl.slice("/api/sticker?".length);
      assert.equal(buildValidatedStickerUrl(new URLSearchParams(qs)), hit.gStaticUrl);
      testedRev1 = true;
      break;
    }
  }
  assert.ok(testedRev1, "Phải có ít nhất một cặp rev=1 trong dataset");

  // Kiểm tra nhánh biên ngoài chỉ số và cặp không tồn tại
  assert.equal(lookupCombination(index, -1, 0), null);
  assert.equal(lookupCombination(index, 0, 9999), null);
  assert.equal(getCompatibleIndices(index, 9999).size, 0);

  // Kiểm tra synthetic index cho rev=2 (:e) hợp lệ, thiếu exception, và cặp null
  const synthetic = buildKitchenIndex({
    v: 1,
    dates: ["20230301"],
    emojis: [
      ["1f600", 1, "grinning", 0],
      ["2615", 2, "coffee", 2],
      ["1f47b", 3, "ghost", 0],
    ],
    combos: [
      "1:0:r,2:0:e",
      "2:0:e",
      "",
    ],
    exceptions: {
      "0:2": "20230301/u1f600/u1f600_u1f47b.png",
      // Cố ý bỏ trống "1:2" để kiểm tra fallback null
    },
  });

  const rev1Combo = lookupCombination(synthetic, 0, 1);
  assert.ok(rev1Combo);
  assert.equal(
    rev1Combo.gStaticUrl,
    "https://www.gstatic.com/android/keyboard/emojikitchen/20230301/u2615/u2615_u1f600.png",
  );

  const rev2Combo = lookupCombination(synthetic, 0, 2);
  assert.ok(rev2Combo);
  assert.equal(
    rev2Combo.gStaticUrl,
    "https://www.gstatic.com/android/keyboard/emojikitchen/20230301/u1f600/u1f600_u1f47b.png",
  );
  assert.equal(
    rev2Combo.proxyUrl,
    `/api/sticker?p=${encodeURIComponent("20230301/u1f600/u1f600_u1f47b.png")}`,
  );
  const rev2Qs = rev2Combo.proxyUrl.slice("/api/sticker?".length);
  assert.equal(buildValidatedStickerUrl(new URLSearchParams(rev2Qs)), rev2Combo.gStaticUrl);

  // rev=2 thiếu key trong exceptions -> null
  assert.equal(lookupCombination(synthetic, 1, 2), null);
  // Cặp tự ghép không khai báo -> null
  assert.equal(lookupCombination(synthetic, 2, 2), null);
});

test("pickRandomCombo returns valid pairs and respects fixedLeftIdx & excludeIdx", () => {
  for (let i = 0; i < 30; i++) {
    const picked = pickRandomCombo(index);
    const combo = lookupCombination(index, picked.leftIdx, picked.rightIdx);
    assert.ok(combo, "Random combo phải luôn hợp lệ");
  }

  const fixedLeft = index.cpToIndex.get("1f47b")!;
  const excludedPartner = Array.from(index.adjacency[fixedLeft])[0]!;
  for (let i = 0; i < 40; i++) {
    const picked = pickRandomCombo(index, fixedLeft, excludedPartner);
    assert.equal(picked.leftIdx, fixedLeft);
    assert.notEqual(picked.rightIdx, excludedPartner);
    assert.ok(lookupCombination(index, picked.leftIdx, picked.rightIdx));
  }

  // excludeIdx khi random cả 2 ô không chọn lại đúng left cũ
  for (let i = 0; i < 40; i++) {
    const picked = pickRandomCombo(index, undefined, fixedLeft);
    assert.notEqual(picked.leftIdx, fixedLeft);
    assert.ok(lookupCombination(index, picked.leftIdx, picked.rightIdx));
  }
});

test("Vietnamese normalization, category filter, and direct emoji paste search", () => {
  assert.equal(normalizeVietnamese("Cà Khịa Đầu Lâu!"), "ca khia dau lau");
  assert.equal(normalizeVietnamese("Trà Sữa Đá"), "tra sua da");
  assert.equal(normalizeVietnamese("Đường Đời Đầy Đắng"), "duong doi day dang");

  const cats = searchEmojis(index, "meo");
  assert.ok(cats.some((e) => e.codepoint === "1f431"));

  const cries = searchEmojis(index, "khoc");
  assert.ok(cries.some((e) => e.codepoint === "1f62d"));

  const boba = searchEmojis(index, "tra sua");
  assert.ok(boba.some((e) => e.codepoint === "1f9cb"));

  // Lọc theo danh mục Đồ ăn & Uống (categoryId = 2)
  const foodOnly = searchEmojis(index, "", 2);
  assert.ok(foodOnly.length > 0);
  assert.ok(foodOnly.every((e) => e.categoryId === 2));

  // Dán trực tiếp ký tự emoji (có và không có \uFE0F)
  const byGhostChar = searchEmojis(index, "👻");
  assert.ok(byGhostChar.some((e) => e.codepoint === "1f47b"));

  const byHeartNoFe0f = searchEmojis(index, "❤");
  assert.ok(
    byHeartNoFe0f.some((e) => e.codepoint.startsWith("2764")),
    "Phải khớp trái tim dù thiếu \\uFE0F",
  );

  const byHeartWithFe0f = searchEmojis(index, "❤️");
  assert.ok(byHeartWithFe0f.some((e) => e.codepoint.startsWith("2764")));

  // Nhập ký tự đặc biệt/chuỗi không tồn tại phải trả mảng rỗng, không trả toàn bộ 619
  assert.equal(searchEmojis(index, "@@@###").length, 0);
  assert.equal(searchEmojis(index, "xyzKhongTonTai999").length, 0);
});

test("toPrintableEmoji and getNotoEmojiSvgUrl handle edge codepoints", () => {
  assert.equal(toPrintableEmoji("1f47b"), "👻");
  assert.equal(toPrintableEmoji("invalid-hex"), "❓");

  assert.equal(
    getNotoEmojiSvgUrl("a9-fe0f"),
    "https://fonts.gstatic.com/s/e/notoemoji/latest/00a9/emoji.svg",
  );
  assert.equal(
    getNotoEmojiSvgUrl("1f47b"),
    "https://fonts.gstatic.com/s/e/notoemoji/latest/1f47b/emoji.svg",
  );
});

test("buildValidatedStickerUrl enforces strict SSRF whitelist, length & repeat bounds", () => {
  const valid = buildValidatedStickerUrl(
    new URLSearchParams("d=20230301&l=u1f600&r=u2615"),
  );
  assert.equal(
    valid,
    "https://www.gstatic.com/android/keyboard/emojikitchen/20230301/u1f600/u1f600_u2615.png",
  );

  const validShort = buildValidatedStickerUrl(
    new URLSearchParams("d=20230301&l=ua9-ufe0f&r=u1f600"),
  );
  assert.ok(validShort);

  const validException = buildValidatedStickerUrl(
    new URLSearchParams("p=20230301/u1f600/u1f600_u2615.png"),
  );
  assert.equal(
    validException,
    "https://www.gstatic.com/android/keyboard/emojikitchen/20230301/u1f600/u1f600_u2615.png",
  );

  const tooManySegments = "u1f600" + "-u200d".repeat(7); // vượt quá giới hạn {0,6}
  const overMaxLength = `20230301/u1f600/${"u1f600-".repeat(20)}u2615.png`;

  const badInputs = [
    "d=2023030&l=u1f600&r=u2615",
    "d=20230301&l=../../etc/passwd&r=u2615",
    "d=20230301&l=http://evil.com&r=u2615",
    `d=20230301&l=${tooManySegments}&r=u2615`,
    "p=",
    "p=../../evil.png",
    "p=20230301/u1f600/u1f600_u2615.jpg",
    `p=${overMaxLength}`,
  ];

  for (const qs of badInputs) {
    assert.equal(
      buildValidatedStickerUrl(new URLSearchParams(qs)),
      null,
      `Phải từ chối query: ${qs}`,
    );
  }
});

test("GET /api/sticker validates params, enforces headers, and maps upstream errors safely", async () => {
  // 0. Chống hotlink từ trang web khác (Sec-Fetch-Site: cross-site) -> 403
  const hotlinkRes = await getStickerRoute(
    new NextRequest("http://localhost:3000/api/sticker?d=20230301&l=u1f600&r=u2615", {
      headers: { "sec-fetch-site": "cross-site" },
    }),
  );
  assert.equal(hotlinkRes.status, 403);
  assert.equal(hotlinkRes.headers.get("cache-control"), "no-store");
  assert.equal(hotlinkRes.headers.get("x-content-type-options"), "nosniff");

  // 1. Tham số không hợp lệ -> 400
  const badRes = await getStickerRoute(
    new NextRequest("http://localhost:3000/api/sticker?d=bad&l=u1f600&r=u2615"),
  );
  assert.equal(badRes.status, 400);
  assert.equal(badRes.headers.get("cache-control"), "no-store");
  assert.equal(badRes.headers.get("x-content-type-options"), "nosniff");

  const originalFetch = globalThis.fetch;
  try {
    // 2. Upstream trả PNG hợp lệ -> 200 + immutable cache headers
    const fakePng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    globalThis.fetch = async (input, init) => {
      assert.equal(
        String(input),
        "https://www.gstatic.com/android/keyboard/emojikitchen/20230301/u1f600/u1f600_u2615.png",
      );
      assert.equal(init?.cache, "no-store");
      assert.equal(init?.redirect, "error");
      return new Response(fakePng, {
        status: 200,
        headers: { "content-type": "image/png" },
      });
    };

    const okRes = await getStickerRoute(
      new NextRequest(
        "http://localhost:3000/api/sticker?d=20230301&l=u1f600&r=u2615",
      ),
    );
    assert.equal(okRes.status, 200);
    assert.equal(okRes.headers.get("content-type"), "image/png");
    assert.equal(
      okRes.headers.get("cache-control"),
      "public, max-age=31536000, s-maxage=31536000, immutable",
    );
    assert.equal(okRes.headers.get("x-content-type-options"), "nosniff");
    assert.equal(okRes.headers.get("vary"), "Sec-Fetch-Site");
    assert.deepEqual(new Uint8Array(await okRes.arrayBuffer()), fakePng);

    // 3. Upstream 404 -> 404 với cache ngắn 300s
    globalThis.fetch = async () => new Response("Not Found", { status: 404 });
    const notFoundRes = await getStickerRoute(
      new NextRequest(
        "http://localhost:3000/api/sticker?d=20230301&l=u1f600&r=u2615",
      ),
    );
    assert.equal(notFoundRes.status, 404);
    assert.equal(notFoundRes.headers.get("cache-control"), "public, max-age=300");

    // 4. Upstream sai content-type -> 502
    globalThis.fetch = async () =>
      new Response("<html>oops</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    const wrongTypeRes = await getStickerRoute(
      new NextRequest(
        "http://localhost:3000/api/sticker?d=20230301&l=u1f600&r=u2615",
      ),
    );
    assert.equal(wrongTypeRes.status, 502);
    assert.equal(wrongTypeRes.headers.get("cache-control"), "no-store");

    // 5. Upstream vượt quá 2MB -> 502
    globalThis.fetch = async () =>
      new Response(new Uint8Array(10), {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(3 * 1024 * 1024),
        },
      });
    const oversizedRes = await getStickerRoute(
      new NextRequest(
        "http://localhost:3000/api/sticker?d=20230301&l=u1f600&r=u2615",
      ),
    );
    assert.equal(oversizedRes.status, 502);

    // 6. Lỗi mạng/timeout -> 502
    globalThis.fetch = async () => {
      throw new Error("network timeout");
    };
    const netErrRes = await getStickerRoute(
      new NextRequest(
        "http://localhost:3000/api/sticker?d=20230301&l=u1f600&r=u2615",
      ),
    );
    assert.equal(netErrRes.status, 502);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
