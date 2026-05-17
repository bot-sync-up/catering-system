import React, { useCallback, useState } from 'react';

interface Props {
  onUpload: (files: File[]) => Promise<void>;
}

/**
 * Channel 4 - Drag & Drop batch uploader. Accepts PDFs and images,
 * sends them as a single multipart batch to /api/ingest/batch.
 */
export const Dropzone: React.FC<Props> = ({ onUpload }) => {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (!files.length) return;
      setBusy(true);
      try {
        await onUpload(files);
      } finally {
        setBusy(false);
      }
    },
    [onUpload],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      style={{
        border: `2px dashed ${over ? '#1f78d1' : '#bbb'}`,
        background: over ? '#eaf4ff' : '#fafafa',
        borderRadius: 8,
        padding: 32,
        textAlign: 'center',
        color: '#444',
        cursor: busy ? 'progress' : 'copy',
      }}
    >
      {busy ? 'מעלה...' : 'גרור לכאן קבצי PDF או תמונות חשבונית'}
    </div>
  );
};
