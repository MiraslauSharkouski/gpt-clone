/**
 * Extract text from a PDF file
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import for ESM compatibility
    const pdfParse = await import("pdf-parse");
    const data = await (pdfParse as any)(buffer);
    return data.text;
  } catch (error) {
    throw new Error(
      `Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
