// Client-side fingerprint collector.
// Reads the same surfaces that anti-fingerprinting tools (e.g. Chameleon) target,
// so the resulting hash captures device/browser identity beyond IP+cookie.

function canvasSignature(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("VibeReview\u2728\u2620fp", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("VibeReview\u2728\u2620fp", 4, 17);
    return canvas.toDataURL();
  } catch {
    return "";
  }
}

function webglSignature(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = dbg
      ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    const version = gl.getParameter(gl.VERSION);
    const shading = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
    return [vendor, renderer, version, shading].join("|");
  } catch {
    return "";
  }
}

async function audioSignature(): Promise<string> {
  try {
    const Ctx: typeof OfflineAudioContext | undefined =
      (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext })
        .OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;
    if (!Ctx) return "";
    const ctx = new Ctx(1, 44100, 44100);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 10000;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;
    osc.connect(compressor);
    compressor.connect(ctx.destination);
    osc.start(0);
    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0);
    let sum = 0;
    for (let i = 4500; i < 5000; i++) sum += Math.abs(data[i] ?? 0);
    return sum.toString();
  } catch {
    return "";
  }
}

const PROBE_FONTS = [
  "Arial", "Arial Black", "Calibri", "Cambria", "Comic Sans MS", "Consolas",
  "Courier New", "Georgia", "Helvetica", "Impact", "Lucida Console",
  "Microsoft Sans Serif", "Palatino Linotype", "Segoe UI", "Tahoma",
  "Times New Roman", "Trebuchet MS", "Verdana", "MS Gothic", "Wingdings",
];

function fontsSignature(): string {
  try {
    const fonts = (document as unknown as { fonts?: { check(spec: string): boolean } }).fonts;
    if (!fonts || typeof fonts.check !== "function") return "";
    return PROBE_FONTS.map((f) => (fonts.check(`12px "${f}"`) ? "1" : "0")).join("");
  } catch {
    return "";
  }
}

function staticSignature(): string {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const parts = [
    nav.userAgent,
    nav.language,
    (nav.languages || []).join(","),
    nav.platform,
    String(nav.hardwareConcurrency ?? ""),
    String(nav.deviceMemory ?? ""),
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    String(screen.pixelDepth),
    String(window.devicePixelRatio ?? ""),
    Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    String(new Date().getTimezoneOffset()),
  ];
  return parts.join("|");
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function collectFingerprint(): Promise<string> {
  const [audio] = await Promise.all([audioSignature()]);
  const composite = [
    staticSignature(),
    canvasSignature(),
    webglSignature(),
    audio,
    fontsSignature(),
  ].join("\n");
  return sha256Hex(composite);
}
