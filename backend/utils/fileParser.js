const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

const parseFileToText = async (file) => {
  const extension = path.extname(file.originalname || '').toLowerCase();

  if (extension === '.txt') {
    return String(file.buffer || '').trim();
  }

  if (extension === '.docx') {
    const docx = await mammoth.extractRawText({ buffer: file.buffer });
    return String(docx.value || '').trim();
  }

  if (extension === '.pdf') {
    const parsed = await pdfParse(file.buffer);
    return String(parsed.text || '').trim();
  }

  throw new Error('Unsupported file format');
};

module.exports = {
  parseFileToText
};