import { API_VERSIONS, type ApiVersion } from '@/constants/order';

type VersionToggleProps = { value: ApiVersion; onChange: (version: ApiVersion) => void };

export function VersionToggle({ value, onChange }: VersionToggleProps) {
  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span id="api-version-label" className="text-[13.5px] font-semibold text-muted">
          Demo: order API version
        </span>
        <div role="group" aria-labelledby="api-version-label" className="inline-flex gap-2">
          {API_VERSIONS.map((version) => (
            <button
              key={version}
              type="button"
              aria-pressed={value === version}
              onClick={() => onChange(version)}
              className={`rounded-sm border px-[14px] py-[5px] text-[12.5px] font-bold transition-colors duration-fast ${
                value === version
                  ? 'border-magenta bg-magenta text-surface'
                  : 'border-line bg-tint text-brand'
              }`}
            >
              {version}
            </button>
          ))}
        </div>
      </div>
      <p className="m-0 text-xs text-muted">
        Both versions create the same order. Only the data shape differs.
      </p>
    </div>
  );
}
