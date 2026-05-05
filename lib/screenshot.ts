export function screenshotUrl(raw: string | undefined | null, width = 800): string | null {
  if (!raw) return null;
  const driveOpen = raw.match(/drive\.google\.com\/open\?id=([\w-]+)/);
  if (driveOpen) return `https://drive.google.com/thumbnail?id=${driveOpen[1]}&sz=w${width}`;
  const driveFile = raw.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (driveFile) return `https://drive.google.com/thumbnail?id=${driveFile[1]}&sz=w${width}`;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return null;
}
