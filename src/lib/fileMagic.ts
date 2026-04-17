const SIGNATURES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  // DOCX is a ZIP file starting with PK
  { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: [0x50, 0x4b, 0x03, 0x04] },
  // Older DOC format
  { mime: "application/msword", bytes: [0xd0, 0xcf, 0x11, 0xe0] },
];

export function validateFileContent(buffer: Buffer, declaredMime: string): boolean {
  for (const sig of SIGNATURES) {
    if (sig.mime !== declaredMime && !(declaredMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && sig.mime === declaredMime)) {
      continue;
    }
    const offset = sig.offset || 0;
    const match = sig.bytes.every((b, i) => buffer[offset + i] === b);
    if (match) return true;
  }
  // For DOCX, also accept if it's a valid ZIP (PK header) regardless of specific MIME mapping
  if (declaredMime.includes("wordprocessingml") || declaredMime === "application/msword") {
    const isPK = buffer[0] === 0x50 && buffer[1] === 0x4b;
    const isOle = buffer[0] === 0xd0 && buffer[1] === 0xcf;
    if (isPK || isOle) return true;
  }
  return false;
}
