/**
 * Extract text from a TXT file (direct read)
 */
export async function extractTextFromTXT(buffer: Buffer): Promise<string> {
  try {
    return buffer.toString('utf-8');
  } catch (error) {
    throw new Error(`Failed to read TXT: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
