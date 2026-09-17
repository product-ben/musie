/**
 * Photo Upload — Layer 2 · §7.18
 * Attach one image — in the reference flow, a photo of handwritten reflection
 * notes.
 *
 * No APG pattern (a file input is a native control with its own affordances)
 * and no base-ui primitive. The native <input type="file"> IS the control: it
 * is visually hidden with `.musy-sr-only` and triggered by a real CTA Button,
 * which is the only accessible way to dress a file input — the input is
 * DISPLACED, never restyled, so keyboard, focus, and the platform picker all
 * behave exactly as the OS intends.
 *
 * Composed on Field's parts (§7.16) rather than re-declaring them: the label,
 * description and error here are `.musy-field__label` / `__description` /
 * `__error`. Only the drop zone and the selected-file row are new, because
 * only those are new.
 *
 * DROP ZONE, NOT A DROP TARGET-ONLY: drag-and-drop is an enhancement layered
 * over the button. Everything reachable by drop is reachable by click and by
 * keyboard (2.1.1).
 *
 * The dashed edge is `--border-style-dashed` (token gap G2, staged) with
 * `--border-subtle`, the documented "awaiting content" treatment — the same
 * one Content Box uses. It is legal here because the zone's affordance is the
 * BUTTON inside it, not the boundary itself.
 */
import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { ImagePlus, Trash2, CircleX } from 'lucide-react';
import { Icon } from './Icon';

export interface UploadedPhoto {
  /** Object URL or data URL for the preview. */
  src: string;
  name: string;
  /** Bytes. Rendered as a human-readable size when present. */
  size?: number;
}

export interface PhotoUploadProps {
  /** Visible label. Required. */
  label: string;
  name?: string;
  /** Controlled selection. `null` renders the empty zone. */
  value?: UploadedPhoto | null;
  onValueChange?: (value: UploadedPhoto | null) => void;
  /** Required whenever a photo is shown: the preview carries meaning (1.1.1). */
  previewAlt: string;
  accept?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  /** Copy. English defaults; the consumer localises. */
  zoneText?: string;
  chooseLabel?: string;
  replaceLabel?: string;
  removeLabel?: string;
  errorWord?: string;
  id?: string;
  className?: string;
}

const UNITS = ['B', 'kB', 'MB'];

function formatSize(bytes: number): string {
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < UNITS.length - 1) { n /= 1024; u += 1; }
  return `${n < 10 && u > 0 ? n.toFixed(1) : Math.round(n)} ${UNITS[u]}`;
}

export function PhotoUpload({
  label, name, value = null, onValueChange, previewAlt,
  accept = 'image/*', description, error,
  disabled = false, required = false,
  zoneText = 'Drag a photo here, or choose one from your device.',
  chooseLabel = 'Choose photo',
  replaceLabel = 'Replace',
  removeLabel = 'Remove photo',
  errorWord = 'Error',
  id, className,
}: PhotoUploadProps) {
  const reactId = React.useId();
  const controlId = id ?? `upload-${reactId}`;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const invalid = Boolean(error);

  const accept_ = (file: File | undefined) => {
    if (!file || disabled) return;
    onValueChange?.({ src: URL.createObjectURL(file), name: file.name, size: file.size });
  };

  /** Revoke the previous object URL so a long session does not leak one blob
   *  per retake. Only URLs this component created are revoked. */
  const created = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (created.current && created.current !== value?.src) {
      URL.revokeObjectURL(created.current);
    }
    created.current = value?.src?.startsWith('blob:') ? value.src : null;
    return () => {
      if (created.current) URL.revokeObjectURL(created.current);
    };
  }, [value?.src]);

  return (
    <div
      className={['musy-field', 'musy-upload', className ?? ''].filter(Boolean).join(' ')}
      data-disabled={disabled ? '' : undefined}
    >
      <label className="musy-field__label" htmlFor={controlId} data-disabled={disabled ? '' : undefined}>
        {label}
        {required && <span className="musy-field__required" aria-hidden="true">*</span>}
      </label>

      <input
        ref={inputRef}
        id={controlId}
        name={name}
        type="file"
        accept={accept}
        required={required}
        disabled={disabled}
        className="musy-sr-only"
        aria-describedby={description ? `${controlId}-desc` : undefined}
        aria-invalid={invalid || undefined}
        onChange={(e) => accept_(e.target.files?.[0])}
      />

      {value ? (
        <div className="musy-upload__preview" data-disabled={disabled ? '' : undefined}>
          <img className="musy-upload__thumb" src={value.src} alt={previewAlt} />
          <div className="musy-upload__meta">
            <span className="musy-upload__name">{value.name}</span>
            {typeof value.size === 'number' && (
              <span className="musy-upload__size">{formatSize(value.size)}</span>
            )}
          </div>
          <div className="musy-upload__preview-actions">
            <Button
              className="musy-btn musy-btn--ghost"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              <span className="musy-btn__label">{replaceLabel}</span>
            </Button>
            <Button
              className="musy-icon-btn musy-icon-btn--ghost musy-icon-btn--primary-size"
              aria-label={removeLabel}
              disabled={disabled}
              onClick={() => onValueChange?.(null)}
            >
              <Icon glyph={Trash2} size="md" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="musy-upload__zone"
          data-dragover={dragOver ? '' : undefined}
          data-disabled={disabled ? '' : undefined}
          data-invalid={invalid ? '' : undefined}
          onDragOver={(e) => { if (!disabled) { e.preventDefault(); setDragOver(true); } }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            accept_(e.dataTransfer.files?.[0]);
          }}
        >
          <span className="musy-upload__zone-icon" aria-hidden="true">
            <Icon glyph={ImagePlus} size="lg" />
          </span>
          <p className="musy-upload__zone-text">{zoneText}</p>
          <Button
            className="musy-btn musy-btn--secondary"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <span className="musy-btn__label">{chooseLabel}</span>
          </Button>
        </div>
      )}

      {error && (
        <div className="musy-field__error" role="alert">
          <Icon glyph={CircleX} size="sm" />
          <span><span className="musy-sr-only">{errorWord}: </span>{error}</span>
        </div>
      )}

      {description && (
        <p className="musy-field__description" id={`${controlId}-desc`} data-disabled={disabled ? '' : undefined}>
          {description}
        </p>
      )}
    </div>
  );
}
