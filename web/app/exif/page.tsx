import type { Metadata } from 'next';
import { ExifViewer } from '@components/exif/ExifViewer';

export const metadata: Metadata = {
  title: 'EXIF Viewer',
  description:
    'Extract and view EXIF metadata from your images. Client-side processing for complete privacy.',
};

export default function ExifPage() {
  return <ExifViewer />;
}
