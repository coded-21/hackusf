const fs = require('fs');
const PDFDocument = require('pdfkit');

// Create a document
const doc = new PDFDocument();

// Pipe its output somewhere, like to a file
doc.pipe(fs.createWriteStream('./public/samples/test.pdf'));

// Add some content
doc.fontSize(25).text('Test PDF Document', 100, 100);
doc.fontSize(16).text('This is a sample PDF created for testing PDF parsing.', 100, 150);

// Add more paragraphs of text for testing extraction
doc.moveDown();
doc.fontSize(12).text(
  'This PDF contains multiple paragraphs of text to test the extraction capabilities of pdf-parse. ' +
  'The parser should be able to extract all text content from this document correctly.'
);

doc.moveDown();
doc.text(
  'PDF parsing is an important feature for the course assistant. ' +
  'It allows students to get summaries and analysis of course materials stored as PDF files.'
);

doc.moveDown();
doc.text(
  'This test document includes various text styles and formatting to ensure robust extraction. ' +
  'If you can read this text in the extracted output, the PDF parser is working correctly.'
);

// Add some styled text
doc.moveDown().moveDown();
doc.fontSize(14).fillColor('blue').text('This is blue text.', {align: 'center'});
doc.fontSize(14).fillColor('red').text('This is red text.', {align: 'center'});
doc.fontSize(14).fillColor('green').text('This is green text.', {align: 'center'});

// Finalize PDF file
doc.end(); 