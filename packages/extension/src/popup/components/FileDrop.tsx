import { useCallback, useState } from 'react';

interface FileDropProps {
  onFile: (file: File) => void;
}

export function FileDrop({ onFile }: FileDropProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && files[0]) {
        onFile(files[0]);
      }
    },
    [onFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div className="p-4">
      <label
        htmlFor="file-input"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'flex flex-col items-center justify-center gap-3',
          'rounded-xl border-2 border-dashed cursor-pointer',
          'py-10 px-4 text-center transition-colors',
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50',
        ].join(' ')}
      >
        <svg
          className="w-10 h-10 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <div>
          <p className="text-sm font-medium text-gray-700">
            Drop a file here, or <span className="text-blue-500">browse</span>
          </p>
          <p className="mt-1 text-xs text-gray-400">JPEG, PNG, PDF, DOCX, MP3, MP4 and more</p>
        </div>
        <input
          id="file-input"
          type="file"
          className="sr-only"
          onChange={handleChange}
          accept="image/*,video/*,audio/*,.pdf,.docx,.xlsx,.pptx,.epub,.svg"
        />
      </label>

      <p className="mt-3 text-xs text-center text-gray-400">Or right-click any image on the page</p>
    </div>
  );
}
