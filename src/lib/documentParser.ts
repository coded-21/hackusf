// Removing direct imports of server-only libraries
// import mammoth from 'mammoth';
// import pdfParse from 'pdf-parse';

/**
 * Supported document types for text extraction
 */
export type DocumentType = 'pdf' | 'docx' | 'pptx' | 'txt' | 'unknown';

/**
 * Determines document type from file extension
 */
export function getDocumentType(filename: string): DocumentType {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  switch (`.${ext}`) {
    case '.pdf':
      return 'pdf';
    case '.docx':
    case '.doc':
      return 'docx';
    case '.pptx':
    case '.ppt':
      return 'pptx';
    case '.txt':
    case '.md':
    case '.js':
    case '.ts':
    case '.jsx':
    case '.tsx':
    case '.html':
    case '.css':
    case '.json':
      return 'txt';
    default:
      return 'unknown';
  }
}

/**
 * Truncate text to a maximum length
 * This is useful when the extracted text is too large for the AI context window
 */
export function truncateText(text: string, maxLength: number = 100000): string {
  if (text.length <= maxLength) return text;
  
  // If we need to truncate, add a note about it
  const truncated = text.substring(0, maxLength);
  return `${truncated}\n\n[Note: This content has been truncated as it exceeds the maximum length. The original document contains more information.]`;
}

// All other document parsing functions have been moved to the server-side API route 