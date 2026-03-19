-- OCR Migration for SYGMA Documents
-- Adds OCR processing columns to the documents table
-- Run this migration against your Supabase database

-- Add OCR text column (full extracted text)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS ocr_text TEXT;

-- Add OCR structured data column (JSON with vendor, date, total, items, etc.)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS ocr_data JSONB;

-- Add OCR processing status
-- Values: pending, processing, completed, failed
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS ocr_status TEXT DEFAULT NULL;

-- Add OCR-generated PDF URL (when source is an image)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS ocr_pdf_url TEXT;

-- Add index on ocr_status for filtering
CREATE INDEX IF NOT EXISTS idx_documents_ocr_status
ON documents (ocr_status)
WHERE ocr_status IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN documents.ocr_text IS 'Raw text extracted by OCR (Gemini or Tesseract)';
COMMENT ON COLUMN documents.ocr_data IS 'Structured JSON data extracted by OCR (vendor, date, total, items, tax, etc.)';
COMMENT ON COLUMN documents.ocr_status IS 'OCR processing status: pending, processing, completed, failed';
COMMENT ON COLUMN documents.ocr_pdf_url IS 'URL of the PDF generated from image with OCR text overlay';
