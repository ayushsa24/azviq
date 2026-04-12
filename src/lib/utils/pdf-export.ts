import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/**
 * Professional PDF Export Utility for Azviq
 * Features: High-quality rendering, page-slicing for perfect margins, 
 * repeating headers/footers, and page-break optimization.
 */
export async function exportToPdf(contentHtml: string, title: string) {
    console.log("[PDF] Starting professional export for:", title);
    
    // 1. Create a high-fidelity rendering container
    const container = document.createElement("div");
    container.setAttribute("id", "pdf-export-container");
    container.style.position = "absolute";
    container.style.top = "-9999px";
    container.style.left = "-9999px";
    container.style.width = "850px"; 
    container.style.background = "white";
    
    container.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            .pdf-body { 
                font-family: 'Inter', sans-serif; 
                padding: 10px 60px 60px; 
                background: white; 
                color: #111;
            }
            .pdf-title-box { border-bottom: 3px solid #000; margin-bottom: 35px; padding-bottom: 15px; }
            .pdf-main-title { font-size: 38px; font-weight: 800; color: #000; margin: 0; }
            .pdf-content { font-size: 16px; line-height: 1.7; }
            
            /* Page Break Optimizations */
            .pdf-content h1, .pdf-content h2, .pdf-content h3 { break-after: avoid; }
            .pdf-content table, .pdf-content pre, .pdf-content blockquote { break-inside: avoid; margin: 2em 0; }
            
            .pdf-content h1 { font-size: 28px; font-weight: 700; margin-top: 1.4em; color: #000; }
            .pdf-content h2 { font-size: 22px; font-weight: 600; margin-top: 1.1em; color: #000; }
            .pdf-content p { margin-bottom: 1.1em; }
            .pdf-content ul, .pdf-content ol { margin-bottom: 1.1em; padding-left: 1.4em; }
            .pdf-content table { width: 100%; border-collapse: collapse; }
            .pdf-content th, .pdf-content td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            .pdf-content th { background: #f9f9f9; font-weight: 700; }
            .pdf-content pre { background: #f4f4f4; padding: 15px; border-radius: 6px; font-family: monospace; white-space: pre-wrap; font-size: 14px; }
            
            .pdf-end-branding { margin-top: 60px; border-top: 1px solid #eee; padding-top: 30px; text-align: center; }
            .pdf-logo-text { font-size: 24px; font-weight: 900; color: #000; }
        </style>
        <div class="pdf-body">
            <div class="pdf-title-box">
                <h1 class="pdf-main-title">${title}</h1>
            </div>
            <div class="pdf-content">${contentHtml}</div>
            <div class="pdf-end-branding">
                <div class="pdf-logo-text">azviq</div>
                <div style="font-size: 14px; color: #666;">Elevate Your Productivity via AI</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(container);

    // Wait for assets/fonts to settle
    await new Promise(r => setTimeout(r, 1000));

    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            width: 850
        });

        if (canvas.height < 50) throw new Error("Canvas rendering failed.");

        // PDF Configuration (A4)
        const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
        const pageWidth = 210;
        const pageHeight = 297;
        
        // Increased margin to prevent "appending" to header/footer
        const marginY = 32; 
        const usableHeightMm = pageHeight - (marginY * 2); 
        
        const pxPerMm = canvas.width / pageWidth;
        const pxPerUsablePage = usableHeightMm * pxPerMm;
        
        const totalPages = Math.ceil(canvas.height / pxPerUsablePage);

        const drawBranding = (p: jsPDF, pageIdx: number, total: number) => {
            // Header (slightly higher)
            p.setFontSize(9);
            p.setTextColor(180, 180, 180);
            p.text(`Azviq Workspace  |  ${title}`, 20, 15);
            p.setDrawColor(240, 240, 240);
            p.line(20, 18, 190, 18);

            // Watermark
            p.saveGraphicsState();
            p.setTextColor(248, 248, 248);
            p.setFontSize(100);
            p.setFont("helvetica", "bold");
            p.text("azviq", 105, 148, { angle: 45, align: "center" });
            p.restoreGraphicsState();

            // Footer (slightly lower)
            p.setFontSize(9);
            p.setTextColor(180, 180, 180);
            p.text(`Azviq.in`, 105, 285, { align: "center" });
            p.text(`Page ${pageIdx} of ${total}`, 190, 285, { align: "right" });
            p.setDrawColor(240, 240, 240);
            p.line(20, 280, 190, 280);
        };

        for (let i = 1; i <= totalPages; i++) {
            if (i > 1) doc.addPage();
            
            const srcY = (i - 1) * pxPerUsablePage;
            let currentSlicePx = pxPerUsablePage;
            
            if (srcY + currentSlicePx > canvas.height) {
                currentSlicePx = canvas.height - srcY;
            }
            
            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = currentSlicePx;
            const ctx = sliceCanvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(canvas, 0, srcY, canvas.width, currentSlicePx, 0, 0, canvas.width, currentSlicePx);
            }
            
            const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
            const sliceHeightMm = (currentSlicePx * pageWidth) / canvas.width;
            
            // Draw branding elements
            drawBranding(doc, i, totalPages);
            
            // Add content with clear separation from header (start at 32mm)
            doc.addImage(sliceData, "JPEG", 0, marginY, pageWidth, sliceHeightMm);
        }

        doc.save(`${title.replace(/[^a-z0-9]/gi, '_')}.pdf`);

    } catch (err) {
        console.error("[PDF Export Error]", err);
        alert("Issue creating PDF. Please try again.");
    } finally {
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }
}
