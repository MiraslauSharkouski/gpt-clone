/**
 * Extract text from a DOCX file
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import for ESM compatibility
    const mammoth = await import("mammoth");
    const result = await (mammoth as any).extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new Error(
      `Failed to parse DOCX: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
