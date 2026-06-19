// Client-side image compression. Keeps upload payloads small and lets the
// editor show the picture instantly while the network call is in flight.
//
// Uploading a 12 MP iPhone photo unscaled is ~5 MB; downsampling to 1600px
// long-edge + webp 0.85 routinely drops that to 150-400 KB without any
// visible quality loss on a phone screen. We also avoid round-tripping a
// huge file through sharp on the server.

export interface CompressOpts {
  maxDim?: number;
  quality?: number;
}

export async function compressImage(file: File, opts: CompressOpts = {}): Promise<File> {
  const { maxDim = 1600, quality = 0.85 } = opts;
  if (!file.type.startsWith('image/')) return file;
  // GIFs lose their animation when re-encoded by canvas; leave them as-is.
  if (file.type === 'image/gif') return file;
  return new Promise<File>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) {
              resolve(file);
              return;
            }
            // If somehow the compressed version is larger (small photo, lots
            // of fine detail) keep the original instead.
            if (blob.size >= file.size) {
              resolve(file);
              return;
            }
            const baseName = file.name.replace(/\.\w+$/, '') || 'image';
            resolve(new File([blob], `${baseName}.webp`, { type: 'image/webp' }));
          },
          'image/webp',
          quality
        );
      } catch {
        URL.revokeObjectURL(url);
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
