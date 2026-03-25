import PDFParser from "pdf2json";

/**
 * Extract text from a PDF file
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData: any) => {
      reject(new Error(errData.parserError));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      // Extract text from all pages
      let fullText = "";

      if (pdfData && pdfData.Pages) {
        for (const page of pdfData.Pages) {
          if (page.Texts) {
            for (const textItem of page.Texts) {
              if (textItem.R && textItem.R.length > 0) {
                for (const run of textItem.R) {
                  if (run.T) {
                    // Decode the text (pdf2json encodes it)
                    const decoded = decodeURIComponent(run.T);
                    fullText += decoded + " ";
                  }
                }
              }
            }
          }
          fullText += "\n";
        }
      }

      resolve(fullText.trim());
    });

    pdfParser.parseBuffer(buffer);
  });
}
