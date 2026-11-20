const DATE_RE = /^\d{8}$/;
const SEGMENT_RE = /^u[0-9a-f]{2,6}(?:-u[0-9a-f]{2,6}){0,6}$/;
const EXCEPTION_PATH_RE =
  /^\d{8}\/u[0-9a-f]{2,6}(?:-u[0-9a-f]{2,6}){0,6}\/u[0-9a-f]{2,6}(?:-u[0-9a-f]{2,6}){0,6}_u[0-9a-f]{2,6}(?:-u[0-9a-f]{2,6}){0,6}\.png$/;

const MAX_PARAM_LENGTH = 128;

export function buildValidatedStickerUrl(
  searchParams: URLSearchParams,
): string | null {
  const pathParam = searchParams.get("p");
  if (pathParam !== null) {
    if (pathParam.length === 0 || pathParam.length > MAX_PARAM_LENGTH) {
      return null;
    }
    if (!EXCEPTION_PATH_RE.test(pathParam)) return null;
    return `https://www.gstatic.com/android/keyboard/emojikitchen/${pathParam}`;
  }

  const d = searchParams.get("d") ?? "";
  const l = searchParams.get("l") ?? "";
  const r = searchParams.get("r") ?? "";

  if (
    d.length > MAX_PARAM_LENGTH ||
    l.length > MAX_PARAM_LENGTH ||
    r.length > MAX_PARAM_LENGTH
  ) {
    return null;
  }

  if (!DATE_RE.test(d) || !SEGMENT_RE.test(l) || !SEGMENT_RE.test(r)) {
    return null;
  }

  return `https://www.gstatic.com/android/keyboard/emojikitchen/${d}/${l}/${l}_${r}.png`;
}
