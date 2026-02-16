import { useRef, useState, useEffect } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n';

interface PhotoUploadProps {
  initialUrl?: string;
  onFileChange: (file: File | null) => void;
  onRemoveExisting?: () => void;
}

export function PhotoUpload({ initialUrl, onFileChange, onRemoveExisting }: PhotoUploadProps) {
  const t = useT();
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      const url = URL.createObjectURL(file);
      setObjectUrl(url);
      setPreview(url);
      onFileChange(file);
    }
  };

  const handleRemove = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    setPreview(null);
    onFileChange(null);
    if (initialUrl) onRemoveExisting?.();
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      {preview ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
          <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-video w-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-muted-foreground/50 active:bg-muted/50"
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Camera className="h-8 w-8" />
            <span className="text-sm">{t('wish_add_photo')}</span>
          </div>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
