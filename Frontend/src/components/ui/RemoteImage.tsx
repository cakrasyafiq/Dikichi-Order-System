import { useState } from 'react';

type RemoteImageProps = {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
};

export function RemoteImage({ src, alt, className = '', eager = false }: RemoteImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  // WHY: stock photos come from a third party, so a failed load must degrade to an empty tile and not a broken icon.
  if (failedSrc === src) return <div aria-hidden="true" className={`bg-tint ${className}`} />;

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailedSrc(src)}
      className={className}
    />
  );
}
