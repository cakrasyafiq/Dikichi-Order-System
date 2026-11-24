type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password';
  autoComplete?: string;
  maxLength?: number;
  error?: string | undefined;
};

export function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  maxLength,
  error,
}: TextFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-[13.5px] font-semibold text-muted">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="w-full rounded-sm border border-line bg-surface px-3 py-[10px] text-sm text-brand"
      />
      {error ? (
        <p id={errorId} className="m-0 mt-1 text-[12.5px] font-semibold text-brand">
          {error}
        </p>
      ) : null}
    </div>
  );
}
