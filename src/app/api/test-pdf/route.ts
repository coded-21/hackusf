import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';

// Mark this as server-side only
export const runtime = 'nodejs';

// Create a test PDF data buffer for testing
function createTestPdfBuffer(): Buffer {
  // Simple PDF content - this would be better with a real PDF file
  // but for testing we'll use a minimal PDF-like buffer
  return Buffer.from(
    `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 68 >>
stream
BT
/F1 24 Tf
100 700 Td
(Test PDF Document for API Testing) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000198 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
316
%%EOF`
  );
}

export async function GET(req: NextRequest) {
  try {
    console.log('Test PDF API called');
    
    // Get test mode from query param
    const testMode = req.nextUrl.searchParams.get('testMode') || 'buffer';
    
    let buffer: Buffer;
    
    if (testMode === 'file' && process.env.NODE_ENV === 'development') {
      // Try to read a file from samples directory if in dev mode
      const sampleDir = path.resolve(process.cwd(), 'public', 'samples');
      const testPdfPath = path.join(sampleDir, 'test.pdf');
      
      if (fs.existsSync(testPdfPath)) {
        console.log(`Reading test PDF from: ${testPdfPath}`);
        buffer = fs.readFileSync(testPdfPath);
      } else {
        console.log('Test PDF file not found, using generated buffer');
        buffer = createTestPdfBuffer();
      }
    } else {
      // Use generated buffer
      console.log('Using generated PDF buffer for testing');
      buffer = createTestPdfBuffer();
    }
    
    // Test processing with pdf-parse
    console.log('Processing PDF with pdf-parse');
    try {
      const data = await pdfParse(buffer);
      
      return NextResponse.json({
        success: true,
        text: data.text,
        info: {
          version: data.version,
          numpages: data.numpages,
          metadata: data.metadata
        }
      });
    } catch (pdfError) {
      console.error('Error parsing PDF:', pdfError);
      return NextResponse.json({
        success: false,
        error: 'PDF parsing error',
        details: pdfError instanceof Error ? pdfError.message : 'Unknown PDF parsing error', 
        stack: pdfError instanceof Error ? pdfError.stack : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in test-pdf API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 