import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Tesseract from "tesseract.js";

// ---------------------------------------------------------------------------
// Gemini Vision OCR (preferred when GOOGLE_API_KEY is set)
// ---------------------------------------------------------------------------
async function ocrWithGemini(
  imageBuffer: Buffer,
  mimeType: string
): Promise<{ text: string; structured: Record<string, unknown> }> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-06-05" });

  const base64 = imageBuffer.toString("base64");

  const prompt = `You are an expert OCR and document analysis system for an accounting platform.
Analyze this document image and extract ALL text you can see.

Then, if this is a receipt or invoice, also extract structured data.

Return your response as valid JSON with this exact structure (no markdown, no code fences):
{
  "raw_text": "<all text extracted from the document>",
  "document_type": "<receipt | invoice | contract | payslip | bank_statement | other>",
  "structured_data": {
    "vendor": "<vendor/company name or null>",
    "invoice_number": "<invoice/receipt number or null>",
    "date": "<date in YYYY-MM-DD format or null>",
    "due_date": "<due date in YYYY-MM-DD format or null>",
    "currency": "<currency code e.g. EUR, USD or null>",
    "subtotal": <number or null>,
    "tax": <number or null>,
    "tax_rate": "<tax rate percentage as string e.g. '20%' or null>",
    "total": <number or null>,
    "items": [
      {
        "description": "<item description>",
        "quantity": <number or null>,
        "unit_price": <number or null>,
        "amount": <number or null>
      }
    ],
    "payment_method": "<payment method or null>",
    "notes": "<any additional notes or null>"
  }
}

If a field cannot be determined, set it to null. Always return valid JSON.`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: mimeType as string,
        data: base64,
      },
    },
  ]);

  const responseText = result.response.text();

  // Strip markdown code fences if present
  const cleaned = responseText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      text: parsed.raw_text || "",
      structured: {
        document_type: parsed.document_type || "other",
        ...parsed.structured_data,
      },
    };
  } catch {
    // If JSON parsing fails, return raw text
    return {
      text: responseText,
      structured: { document_type: "other", vendor: null, date: null, total: null, items: [] },
    };
  }
}

// ---------------------------------------------------------------------------
// Tesseract.js OCR (fallback — free, no API key needed)
// ---------------------------------------------------------------------------
async function ocrWithTesseract(
  imageBuffer: Buffer
): Promise<{ text: string; structured: Record<string, unknown> }> {
  const {
    data: { text },
  } = await Tesseract.recognize(imageBuffer, "fra+eng", {
    logger: () => {},
  });

  // Basic heuristic extraction from raw text
  const structured = extractStructuredData(text);

  return { text, structured };
}

/** Simple regex-based extraction for receipts/invoices */
function extractStructuredData(text: string): Record<string, unknown> {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Vendor — usually first non-empty line
  const vendor = lines[0] || null;

  // Date patterns: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
  const dateMatch = text.match(
    /(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}|\d{4}[/\-\.]\d{1,2}[/\-\.]\d{1,2})/
  );
  let date: string | null = null;
  if (dateMatch) {
    const raw = dateMatch[1];
    // Try to normalise to YYYY-MM-DD
    const parts = raw.split(/[/\-\.]/);
    if (parts[0].length === 4) {
      date = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    } else if (parts[2].length === 4) {
      date = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    } else {
      date = raw;
    }
  }

  // Total — look for "total", "montant", "ttc" followed by a number
  const totalMatch = text.match(
    /(?:total|montant\s*ttc|ttc|amount\s*due|grand\s*total)[^\d]*(\d[\d\s,.]*\d)/i
  );
  const total = totalMatch
    ? parseFloat(totalMatch[1].replace(/\s/g, "").replace(",", "."))
    : null;

  // Tax
  const taxMatch = text.match(
    /(?:tva|tax|vat)[^\d]*(\d[\d\s,.]*\d)/i
  );
  const tax = taxMatch
    ? parseFloat(taxMatch[1].replace(/\s/g, "").replace(",", "."))
    : null;

  // Invoice number
  const invoiceMatch = text.match(
    /(?:facture|invoice|n[°o]|ref)[^\w]*([A-Z0-9][\w\-\/]*)/i
  );
  const invoice_number = invoiceMatch ? invoiceMatch[1] : null;

  return {
    document_type: "other",
    vendor,
    invoice_number,
    date,
    due_date: null,
    currency: text.match(/€/) ? "EUR" : text.match(/\$/) ? "USD" : null,
    subtotal: null,
    tax,
    tax_rate: null,
    total,
    items: [],
    payment_method: null,
    notes: null,
  };
}

// ---------------------------------------------------------------------------
// PDF generation from image + OCR text
// ---------------------------------------------------------------------------
async function generatePdfFromImage(
  imageBuffer: Buffer,
  mimeType: string,
  ocrText: string
): Promise<Buffer> {
  // Minimal PDF with the image embedded and OCR text as invisible overlay
  // Using a simple PDF structure that embeds the image
  const isJpeg = mimeType.includes("jpeg") || mimeType.includes("jpg");
  const isPng = mimeType.includes("png");
  const imageFilter = isJpeg ? "/DCTDecode" : isPng ? "/FlateDecode" : "/DCTDecode";
  const colorSpace = "/DeviceRGB";

  // Estimate image dimensions (default A4-ish)
  const pageWidth = 595;
  const pageHeight = 842;

  // Escape special PDF characters in text
  const safeText = ocrText
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .substring(0, 5000); // Limit text length

  const objects: string[] = [];
  const offsets: number[] = [];

  // Build PDF objects
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /XObject << /Img 5 0 R >> /Font << /F1 6 0 R >> >> >>\nendobj`
  );

  // Page content stream: draw image full page, then invisible text
  const contentStream = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Img Do\nQ\n3 Tr\nBT\n/F1 1 Tf\n10 10 Td\n(${safeText.substring(0, 2000)}) Tj\nET`;
  objects.push(
    `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj`
  );

  // Image XObject
  objects.push(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pageWidth} /Height ${pageHeight} /ColorSpace ${colorSpace} /BitsPerComponent 8 /Filter ${imageFilter} /Length ${imageBuffer.length} >>\nstream\n`
  );
  // We'll handle the image stream separately

  // Font
  objects.push(
    "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj"
  );

  // Build the PDF manually
  let pdf = "%PDF-1.4\n";

  // Objects 1-4 and 6
  for (let i = 0; i < objects.length; i++) {
    if (i === 4) continue; // Skip image object, handle separately
    offsets[i] = pdf.length;
    pdf += objects[i] + "\n";
  }

  // Image object (5) - needs binary data
  offsets[4] = pdf.length;
  const pdfPart1 = Buffer.from(pdf, "binary");
  const imageHeader = Buffer.from(objects[4], "binary");
  const imageFooter = Buffer.from("\nendstream\nendobj\n", "binary");

  // Cross-reference table
  const xrefOffset =
    pdfPart1.length + imageHeader.length + imageBuffer.length + imageFooter.length;

  let xref = `xref\n0 7\n0000000000 65535 f \n`;
  // Simplified: just output the trailer
  for (let i = 0; i < 6; i++) {
    const off = offsets[i] || 0;
    xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const xrefBuf = Buffer.from(xref, "binary");

  return Buffer.concat([pdfPart1, imageHeader, imageBuffer, imageFooter, xrefBuf]);
}

// ---------------------------------------------------------------------------
// API Route Handler
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId est requis" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch document record
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Document introuvable" },
        { status: 404 }
      );
    }

    // 2. Update status to processing
    await supabase
      .from("documents")
      .update({ ocr_status: "processing" })
      .eq("id", documentId);

    // 3. Fetch the file from Supabase storage or public URL
    let fileBuffer: Buffer;
    let mimeType = "image/jpeg";

    try {
      // Try to download from the public URL
      const fileUrl = doc.file_url;
      if (!fileUrl) {
        throw new Error("Aucune URL de fichier trouvée");
      }

      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Erreur lors du téléchargement: ${fileResponse.status}`);
      }

      mimeType = fileResponse.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await fileResponse.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } catch (fetchError) {
      await supabase
        .from("documents")
        .update({ ocr_status: "failed" })
        .eq("id", documentId);

      return NextResponse.json(
        {
          error: "Impossible de télécharger le fichier",
          details: fetchError instanceof Error ? fetchError.message : "Unknown",
        },
        { status: 500 }
      );
    }

    // 4. Determine if we can use the file for OCR
    const isImage =
      mimeType.includes("image/jpeg") ||
      mimeType.includes("image/png") ||
      mimeType.includes("image/heic") ||
      mimeType.includes("image/webp");
    const isPdf = mimeType.includes("application/pdf");

    if (!isImage && !isPdf) {
      await supabase
        .from("documents")
        .update({ ocr_status: "failed" })
        .eq("id", documentId);

      return NextResponse.json(
        { error: "Format de fichier non supporté pour l'OCR. Formats acceptés: JPEG, PNG, HEIC, PDF" },
        { status: 400 }
      );
    }

    // 5. Run OCR
    let ocrResult: { text: string; structured: Record<string, unknown> };

    try {
      if (process.env.GOOGLE_API_KEY) {
        // Prefer Gemini — better accuracy, structured extraction
        ocrResult = await ocrWithGemini(fileBuffer, mimeType);
      } else {
        // Fallback to Tesseract.js — free, no API key needed
        if (isPdf) {
          await supabase
            .from("documents")
            .update({ ocr_status: "failed" })
            .eq("id", documentId);

          return NextResponse.json(
            {
              error:
                "Le traitement OCR des PDF nécessite GOOGLE_API_KEY. Veuillez uploader une image (JPEG, PNG) ou configurer la clé API Gemini.",
            },
            { status: 400 }
          );
        }
        ocrResult = await ocrWithTesseract(fileBuffer);
      }
    } catch (ocrError) {
      console.error("OCR processing error:", ocrError);
      await supabase
        .from("documents")
        .update({ ocr_status: "failed" })
        .eq("id", documentId);

      return NextResponse.json(
        {
          error: "Erreur lors du traitement OCR",
          details: ocrError instanceof Error ? ocrError.message : "Unknown",
        },
        { status: 500 }
      );
    }

    // 6. Generate PDF if the source is an image
    let pdfUrl: string | null = null;
    if (isImage) {
      try {
        const pdfBuffer = await generatePdfFromImage(
          fileBuffer,
          mimeType,
          ocrResult.text
        );
        const pdfPath = `${doc.client_id || "general"}/ocr_${Date.now()}_${doc.name?.replace(/\.[^.]+$/, "")}.pdf`;

        const { error: pdfUploadError } = await supabase.storage
          .from("documents")
          .upload(pdfPath, pdfBuffer, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (!pdfUploadError) {
          const { data: pdfUrlData } = supabase.storage
            .from("documents")
            .getPublicUrl(pdfPath);
          pdfUrl = pdfUrlData.publicUrl;
        }
      } catch (pdfError) {
        // PDF generation is best-effort
        console.warn("PDF generation failed (non-blocking):", pdfError);
      }
    }

    // 7. Update document with OCR results
    const updateData: Record<string, unknown> = {
      ocr_text: ocrResult.text,
      ocr_data: ocrResult.structured,
      ocr_status: "completed",
    };

    if (pdfUrl) {
      updateData.ocr_pdf_url = pdfUrl;
    }

    const { error: updateError } = await supabase
      .from("documents")
      .update(updateData)
      .eq("id", documentId);

    if (updateError) {
      console.error("Failed to update document with OCR results:", updateError);
    }

    return NextResponse.json({
      success: true,
      text: ocrResult.text,
      structured_data: ocrResult.structured,
      pdf_url: pdfUrl,
      ocr_engine: process.env.GOOGLE_API_KEY ? "gemini" : "tesseract",
    });
  } catch (error) {
    console.error("OCR route error:", error);
    return NextResponse.json(
      {
        error: "Erreur serveur lors du traitement OCR",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
