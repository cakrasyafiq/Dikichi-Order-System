import { useState } from 'react';

type RemoteImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  eager?: boolean;
};

export function RemoteImage({ src, alt, className = '', eager = false }: RemoteImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const resolvedSrc = src?.trim();

  // WHY: missing or failed images must degrade to an empty tile and not a broken icon.
  if (!resolvedSrc || failedSrc === resolvedSrc) {
    return <div aria-hidden="true" className={`bg-tint ${className}`} />;
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailedSrc(resolvedSrc)}
      className={className}
    />
  );
}
