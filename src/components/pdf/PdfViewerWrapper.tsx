"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Loader2 } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set the worker for pdfjs-dist to match the exact API version
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface PageDim {
  width: number;
  height: number;
}

interface PdfViewerWrapperProps {
  fileUrl: string;
  onNumPagesLoaded?: (numPages: number) => void;
  onPageDimLoaded?: (pageNum: number, dim: PageDim) => void;
  scale?: number;
  width?: number;
  mode?: "full" | "thumbnails";
  currentPage?: number;
  onThumbnailClick?: (pageNum: number) => void;
  renderOverlay?: (pageNum: number, dim: PageDim) => React.ReactNode;
  onLoadError?: (error: Error) => void;
}

export default function PdfViewerWrapper({
  fileUrl,
  onNumPagesLoaded,
  onPageDimLoaded,
  scale = 1,
  width,
  mode = "full",
  currentPage = 1,
  onThumbnailClick,
  renderOverlay,
  onLoadError,
}: PdfViewerWrapperProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageDims, setPageDims] = useState<Record<number, PageDim>>({});

  const handleLoadSuccess = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    onNumPagesLoaded?.(total);
  }, [onNumPagesLoaded]);

  const handlePageRenderSuccess = useCallback((pageNum: number, pageInfo: any) => {
    const dim = { width: pageInfo.width, height: pageInfo.height };
    setPageDims(prev => {
      if (prev[pageNum]) return prev;
      return { ...prev, [pageNum]: dim };
    });
    onPageDimLoaded?.(pageNum, dim);
  }, [onPageDimLoaded]);

  // THUMBNAIL sidebar mode
  if (mode === "thumbnails") {
    return (
      <Document
        file={fileUrl}
        onLoadSuccess={handleLoadSuccess}
        onLoadError={onLoadError}
        loading={null}
        className="flex flex-col gap-4 items-center"
      >
        {Array.from({ length: numPages }, (_, i) => {
          const pg = i + 1;
          const isActive = currentPage === pg;
          return (
            <div
              key={pg}
              id={`thumb-item-${pg}`}
              className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-300 transform ${
                isActive
                  ? "border-[#252525] dark:border-white bg-[#F5F3EF] dark:bg-[#3A3A3A] shadow-md scale-102"
                  : "border-transparent bg-white dark:bg-transparent hover:border-[#BABABA] dark:hover:border-[#545454]"
              }`}
              onClick={() => onThumbnailClick?.(pg)}
            >
              <Page
                pageNumber={pg}
                width={120}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                className="shadow-sm bg-white"
              />
              <div
                className={`text-center py-1 text-xs font-semibold transition-colors ${
                  isActive
                    ? "text-[#252525] dark:text-white bg-[#E8E5E0] dark:bg-[#333] font-bold"
                    : "text-[#545454] dark:text-[#7D7D7D] bg-[#F5F3EF] dark:bg-[#1A1A1A]"
                }`}
              >
                {pg}
              </div>
            </div>
          );
        })}
      </Document>
    );
  }

  // FULL mode - all pages with overlay support
  return (
    <Document
      file={fileUrl}
      onLoadSuccess={handleLoadSuccess}
      onLoadError={onLoadError}
      className="flex flex-col gap-4 sm:gap-8 pb-32 items-center"
      loading={
        <div className="flex flex-col gap-8 w-full items-center p-4 sm:p-12">
          {Array.from({ length: 3 }).map((_, i) => (
            <div 
              key={i} 
              className="bg-white/50 dark:bg-white/5 shadow-md animate-pulse rounded-sm w-full max-w-3xl"
              style={{ 
                height: (width || 800) * 1.41,
                transform: `scale(${scale})`,
                transformOrigin: 'top center'
              }}
            />
          ))}
        </div>
      }
    >
      {Array.from({ length: numPages }, (_, i) => {
        const pg = i + 1;
        return (
          <div
            key={pg}
            id={`pdf-page-${pg}`}
            className="relative bg-white shadow-md sm:shadow-lg transition-all"
          >
            <Page
              pageNumber={pg}
              width={width || undefined}
              scale={scale}
              className="bg-white pointer-events-none"
              renderAnnotationLayer={false}
              renderTextLayer={false}
              onRenderSuccess={(pageInfo: any) => {
                if (scale !== 1) return;
                handlePageRenderSuccess(pg, pageInfo);
              }}
            />
            {pageDims[pg] && renderOverlay?.(pg, pageDims[pg])}
          </div>
        );
      })}
    </Document>
  );
}
