'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import exifr from 'exifr';
import { cn } from '@utils/cn';

interface ExifData {
  [key: string]: unknown;
}

interface CategoryData {
  label: string;
  icon: React.ReactNode;
  fields: { key: string; label: string; value: string }[];
}

const formatExifValue = (key: string, value: unknown): string => {
  if (value === undefined || value === null) return '—';

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  if (key.toLowerCase().includes('gps') && typeof value === 'number') {
    return value.toFixed(6);
  }

  if (key === 'ExposureTime' && typeof value === 'number') {
    if (value < 1) {
      return `1/${Math.round(1 / value)}s`;
    }
    return `${value}s`;
  }

  if (key === 'FNumber' && typeof value === 'number') {
    return `f/${value}`;
  }

  if (key === 'FocalLength' && typeof value === 'number') {
    return `${value}mm`;
  }

  if (key === 'ISO' || key === 'ISOSpeedRatings') {
    return `ISO ${value}`;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return String(value);
};

const categorizeExifData = (data: ExifData): CategoryData[] => {
  const categories: CategoryData[] = [];

  const cameraFields = [
    { key: 'Make', label: 'Camera Make' },
    { key: 'Model', label: 'Camera Model' },
    { key: 'Software', label: 'Software' },
    { key: 'DateTimeOriginal', label: 'Date Taken' },
    { key: 'CreateDate', label: 'Created' },
    { key: 'ModifyDate', label: 'Modified' },
  ];

  const cameraData = cameraFields
    .filter((f) => data[f.key] !== undefined)
    .map((f) => ({ key: f.key, label: f.label, value: formatExifValue(f.key, data[f.key]) }));

  if (cameraData.length > 0) {
    categories.push({
      label: 'Camera',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      fields: cameraData,
    });
  }

  const lensFields = [
    { key: 'LensModel', label: 'Lens Model' },
    { key: 'LensMake', label: 'Lens Make' },
    { key: 'FocalLength', label: 'Focal Length' },
    { key: 'FocalLengthIn35mmFormat', label: '35mm Equivalent' },
    { key: 'MaxApertureValue', label: 'Max Aperture' },
  ];

  const lensData = lensFields
    .filter((f) => data[f.key] !== undefined)
    .map((f) => ({ key: f.key, label: f.label, value: formatExifValue(f.key, data[f.key]) }));

  if (lensData.length > 0) {
    categories.push({
      label: 'Lens',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12a3 3 0 106 0 3 3 0 00-6 0z"
          />
        </svg>
      ),
      fields: lensData,
    });
  }

  const exposureFields = [
    { key: 'ExposureTime', label: 'Shutter Speed' },
    { key: 'FNumber', label: 'Aperture' },
    { key: 'ISO', label: 'ISO' },
    { key: 'ISOSpeedRatings', label: 'ISO Speed' },
    { key: 'ExposureCompensation', label: 'Exposure Comp.' },
    { key: 'ExposureMode', label: 'Exposure Mode' },
    { key: 'ExposureProgram', label: 'Program' },
    { key: 'MeteringMode', label: 'Metering' },
    { key: 'WhiteBalance', label: 'White Balance' },
    { key: 'Flash', label: 'Flash' },
  ];

  const exposureData = exposureFields
    .filter((f) => data[f.key] !== undefined)
    .map((f) => ({ key: f.key, label: f.label, value: formatExifValue(f.key, data[f.key]) }));

  if (exposureData.length > 0) {
    categories.push({
      label: 'Exposure',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
      fields: exposureData,
    });
  }

  const imageFields = [
    { key: 'ImageWidth', label: 'Width' },
    { key: 'ImageHeight', label: 'Height' },
    { key: 'ExifImageWidth', label: 'EXIF Width' },
    { key: 'ExifImageHeight', label: 'EXIF Height' },
    { key: 'Orientation', label: 'Orientation' },
    { key: 'ColorSpace', label: 'Color Space' },
    { key: 'BitsPerSample', label: 'Bit Depth' },
    { key: 'Compression', label: 'Compression' },
  ];

  const imageData = imageFields
    .filter((f) => data[f.key] !== undefined)
    .map((f) => ({ key: f.key, label: f.label, value: formatExifValue(f.key, data[f.key]) }));

  if (imageData.length > 0) {
    categories.push({
      label: 'Image',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      fields: imageData,
    });
  }

  const gpsFields = [
    { key: 'latitude', label: 'Latitude' },
    { key: 'longitude', label: 'Longitude' },
    { key: 'GPSAltitude', label: 'Altitude' },
    { key: 'GPSSpeed', label: 'Speed' },
    { key: 'GPSImgDirection', label: 'Direction' },
    { key: 'GPSDateStamp', label: 'GPS Date' },
    { key: 'GPSTimeStamp', label: 'GPS Time' },
  ];

  const gpsData = gpsFields
    .filter((f) => data[f.key] !== undefined)
    .map((f) => ({ key: f.key, label: f.label, value: formatExifValue(f.key, data[f.key]) }));

  if (gpsData.length > 0) {
    categories.push({
      label: 'Location',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      fields: gpsData,
    });
  }

  const knownKeys = new Set([
    ...cameraFields.map((f) => f.key),
    ...lensFields.map((f) => f.key),
    ...exposureFields.map((f) => f.key),
    ...imageFields.map((f) => f.key),
    ...gpsFields.map((f) => f.key),
    'thumbnail',
    'ThumbnailImage',
    'PreviewImage',
  ]);

  const otherData = Object.entries(data)
    .filter(([key]) => !knownKeys.has(key))
    .map(([key, value]) => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').trim(),
      value: formatExifValue(key, value),
    }));

  if (otherData.length > 0) {
    categories.push({
      label: 'Other',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      fields: otherData,
    });
  }

  return categories;
};

export function ExifViewer() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [exifData, setExifData] = useState<ExifData | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (categories.length > 0) {
      setExpandedCategories(new Set(categories.map((c) => c.label)));
    }
  }, [categories]);

  const processFile = useCallback(async (selectedFile: File) => {
    setIsLoading(true);
    setError(null);
    setFile(selectedFile);

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);

    try {
      const data = await exifr.parse(selectedFile, {
        tiff: true,
        exif: true,
        gps: true,
        interop: true,
        iptc: true,
        xmp: true,
        icc: true,
        makerNote: false,
        translateKeys: true,
        translateValues: true,
        reviveValues: true,
      });

      if (!data || Object.keys(data).length === 0) {
        setExifData(null);
        setCategories([]);
        setError('No EXIF data found in this image.');
      } else {
        setExifData(data);
        setCategories(categorizeExifData(data));
      }
    } catch {
      setError('Failed to parse EXIF data. The file may be corrupted or not supported.');
      setExifData(null);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && droppedFile.type.startsWith('image/')) {
        processFile(droppedFile);
      } else {
        setError('Please drop an image file (JPEG, PNG, TIFF, etc.)');
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        processFile(selectedFile);
      }
    },
    [processFile]
  );

  const toggleCategory = useCallback((label: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  const downloadExif = useCallback(
    (format: 'json' | 'txt') => {
      if (!exifData || !file) return;

      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === 'json') {
        content = JSON.stringify(exifData, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      } else {
        content = categories
          .map((cat) => {
            const header = `\n${'='.repeat(40)}\n${cat.label.toUpperCase()}\n${'='.repeat(40)}\n`;
            const fields = cat.fields.map((f) => `${f.label}: ${f.value}`).join('\n');
            return header + fields;
          })
          .join('\n');
        mimeType = 'text/plain';
        extension = 'txt';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace(/\.[^/.]+$/, '')}_exif.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [exifData, file, categories]
  );

  const reset = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setExifData(null);
    setCategories([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [preview]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0c0c0e]">
      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 h-[600px] w-[600px] rounded-full bg-amber-500/[0.03] blur-[120px]" />
        <div className="absolute right-0 bottom-1/4 h-[400px] w-[400px] rounded-full bg-orange-600/[0.02] blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {/* Header */}
        <header className="mb-12">
          <nav className="mb-8 flex items-center gap-2 font-mono text-xs tracking-wide text-neutral-500">
            <a href="/" className="transition-colors hover:text-amber-500">
              ImageTools
            </a>
            <span>/</span>
            <span className="text-neutral-300">EXIF Viewer</span>
          </nav>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-mono text-3xl font-light tracking-tight text-white sm:text-4xl">
                EXIF<span className="text-amber-500">.</span>Viewer
              </h1>
              <p className="mt-2 max-w-lg font-mono text-sm text-neutral-500">
                Extract metadata from your images. Everything runs locally in your browser — your
                files never leave your device.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/50 px-3 py-1.5 font-mono text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Client-side only
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Upload/Preview */}
          <div className="space-y-6">
            {/* Upload zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300',
                isDragging
                  ? 'border-amber-500 bg-amber-500/5'
                  : 'border-neutral-800 bg-neutral-900/30 hover:border-neutral-700 hover:bg-neutral-900/50',
                !preview && 'aspect-[4/3]'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-auto w-full rounded-2xl object-contain"
                    style={{ maxHeight: '500px' }}
                  />

                  {/* Overlay controls */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <div className="text-center">
                      <p className="font-mono text-sm text-white">Click to replace</p>
                      <p className="mt-1 font-mono text-xs text-neutral-400">or drag a new image</p>
                    </div>
                  </div>

                  {/* File info badge */}
                  <div className="absolute right-3 bottom-3 rounded-lg bg-black/80 px-3 py-1.5 font-mono text-xs text-neutral-300 backdrop-blur-sm">
                    {file?.name}
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8">
                  <div className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 transition-colors group-hover:border-amber-500/30 group-hover:bg-amber-500/5">
                    <svg
                      className="h-8 w-8 text-neutral-500 transition-colors group-hover:text-amber-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>

                  <p className="font-mono text-sm text-neutral-300">
                    Drop an image here or{' '}
                    <span className="text-amber-500 underline decoration-amber-500/30 underline-offset-4">
                      browse
                    </span>
                  </p>
                  <p className="mt-2 font-mono text-xs text-neutral-600">
                    Supports JPEG, PNG, TIFF, HEIC, WebP
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="flex items-center gap-3 font-mono text-sm text-amber-500">
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Extracting EXIF data...
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {preview && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={reset}
                  className="group flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-2 font-mono text-xs text-neutral-400 transition-all hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Clear
                </button>

                {exifData && (
                  <>
                    <button
                      onClick={() => downloadExif('json')}
                      className="group flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-2 font-mono text-xs text-neutral-400 transition-all hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-400"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download JSON
                    </button>

                    <button
                      onClick={() => downloadExif('txt')}
                      className="group flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-2 font-mono text-xs text-neutral-400 transition-all hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-400"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Download TXT
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 font-mono text-sm text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Right: EXIF Data */}
          <div className="space-y-4">
            {!preview && (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/20 p-12">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900">
                    <svg
                      className="h-8 w-8 text-neutral-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <p className="font-mono text-sm text-neutral-500">
                    EXIF data will appear here
                  </p>
                </div>
              </div>
            )}

            {preview && categories.length === 0 && !isLoading && !error && (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800">
                  <svg
                    className="h-6 w-6 text-neutral-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                </div>
                <p className="font-mono text-sm text-neutral-400">No EXIF metadata found</p>
                <p className="mt-1 font-mono text-xs text-neutral-600">
                  This image doesn&apos;t contain EXIF data, or it may have been stripped.
                </p>
              </div>
            )}

            {categories.map((category, idx) => (
              <div
                key={category.label}
                className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/40 backdrop-blur-sm"
                style={{
                  animationDelay: `${idx * 50}ms`,
                  animation: 'fadeSlideIn 0.4s ease-out forwards',
                  opacity: 0,
                }}
              >
                <button
                  onClick={() => toggleCategory(category.label)}
                  className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-800/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                      {category.icon}
                    </div>
                    <span className="font-mono text-sm font-medium text-neutral-200">
                      {category.label}
                    </span>
                    <span className="rounded-full bg-neutral-800 px-2 py-0.5 font-mono text-xs text-neutral-500">
                      {category.fields.length}
                    </span>
                  </div>

                  <svg
                    className={cn(
                      'h-4 w-4 text-neutral-500 transition-transform duration-200',
                      expandedCategories.has(category.label) && 'rotate-180'
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <div
                  className={cn(
                    'grid transition-all duration-200',
                    expandedCategories.has(category.label)
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-neutral-800/50 px-4 py-2">
                      {category.fields.map((field, fieldIdx) => (
                        <div
                          key={field.key}
                          className={cn(
                            'flex items-start justify-between gap-4 py-2',
                            fieldIdx !== category.fields.length - 1 &&
                              'border-b border-neutral-800/30'
                          )}
                        >
                          <span className="shrink-0 font-mono text-xs text-neutral-500">
                            {field.label}
                          </span>
                          <span className="text-right font-mono text-xs text-neutral-300 break-all">
                            {field.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-neutral-800/50 pt-8 text-center">
          <p className="font-mono text-xs text-neutral-600">
            All processing happens in your browser. No data is uploaded to any server.
          </p>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
