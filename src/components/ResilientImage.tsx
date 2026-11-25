import { useState } from 'react';
import { Scissors } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function ResilientImage({ src, alt, className = '', fallbackLabel }: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F1EFE9] via-[#E8E4DA] to-[#DFDAD0] text-[#5A5C63] border border-[#E5E1D8] ${className}`}
        role="img"
        aria-label={alt}
      >
        <Scissors className="w-7 h-7 text-[#14532D] mb-2 opacity-80" />
        <span className="text-xs font-medium tracking-wide text-[#18191B] px-4 text-center">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
