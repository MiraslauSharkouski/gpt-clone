import { extractTextFromPDF } from './pdf-extractor';
import { extractTextFromDOCX } from './docx-extractor';
import { extractTextFromTXT } from './txt-extractor';

export type FileType = 'pdf' | 'docx' | 'txt';

/**
 * Extract text from a file based on its type
 */
export async function extractText(buffer: Buffer, fileType: FileType): Promise<string> {
  switch (fileType) {
    case 'pdf':
      return extractTextFromPDF(buffer);
    case 'docx':
      return extractTextFromDOCX(buffer);
    case 'txt':
      return extractTextFromTXT(buffer);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
}
