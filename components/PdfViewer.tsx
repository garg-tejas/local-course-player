
import React, { useEffect, useState } from 'react';

interface PdfViewerProps {
  file: File;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ file }) => {
  const [pdfUrl, setPdfUrl] = useState<string>('');

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);

      return () => {
        URL.revokeObjectURL(url);
        setPdfUrl('');
      };
    }
  }, [file]);

  if (!pdfUrl) return null;

  return (
    <div className="absolute inset-0 w-full h-full bg-gray-800">
      <iframe
        key={pdfUrl}
        src={pdfUrl}
        className="w-full h-full border-none"
        title={file.name}
      />
    </div>
  );
};

export default PdfViewer;
