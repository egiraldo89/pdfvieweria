'use client';

import { Plugin, Viewer, Worker } from '@react-pdf-viewer/core';

interface PdfViewerWrapperProps {
  pdfFile: string;
  plugins: Plugin[];
}

export default function PdfViewerWrapper({ pdfFile, plugins }: PdfViewerWrapperProps) {
  return (
    <div
      className="flex-1 overflow-auto"
      style={{ WebkitTouchCallout: 'none' } as React.CSSProperties}
    >
      <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
        <Viewer fileUrl={pdfFile} plugins={plugins} />
      </Worker>
    </div>
  );
}
