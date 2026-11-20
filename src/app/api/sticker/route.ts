import { NextRequest, NextResponse } from "next/server";
import { buildValidatedStickerUrl } from "@/lib/sticker-url";

const UPSTREAM_TIMEOUT_MS = 8_000;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

async function readLimitedBytes(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!response.body) {
    const buf = await response.arrayBuffer();
    if (buf.byteLength > maxBytes) return null;
    return new Uint8Array(buf);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

export async function GET(request: NextRequest) {
  const upstreamUrl = buildValidatedStickerUrl(request.nextUrl.searchParams);
  if (!upstreamUrl) {
    return NextResponse.json(
      { error: "Tham số sticker không hợp lệ" },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!upstream.ok) {
      await upstream.body?.cancel().catch(() => {});
      const isNotFound = upstream.status === 404;
      return NextResponse.json(
        { error: "Không tìm thấy ảnh sticker" },
        {
          status: isNotFound ? 404 : 502,
          headers: {
            "Cache-Control": isNotFound ? "public, max-age=300" : "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }

    const contentType = (upstream.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.startsWith("image/png")) {
      await upstream.body?.cancel().catch(() => {});
      return NextResponse.json(
        { error: "Định dạng ảnh sticker không hợp lệ" },
        {
          status: 502,
          headers: {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }

    const contentLengthHeader = upstream.headers.get("content-length");
    if (contentLengthHeader) {
      const declaredBytes = Number(contentLengthHeader);
      if (Number.isFinite(declaredBytes) && declaredBytes > MAX_IMAGE_BYTES) {
        await upstream.body?.cancel().catch(() => {});
        return NextResponse.json(
          { error: "Ảnh sticker vượt quá giới hạn dung lượng" },
          {
            status: 502,
            headers: {
              "Cache-Control": "no-store",
              "X-Content-Type-Options": "nosniff",
            },
          },
        );
      }
    }

    const bytes = await readLimitedBytes(upstream, MAX_IMAGE_BYTES);
    if (!bytes) {
      return NextResponse.json(
        { error: "Ảnh sticker vượt quá giới hạn dung lượng" },
        {
          status: 502,
          headers: {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Lỗi kết nối khi tải sticker" },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
}
