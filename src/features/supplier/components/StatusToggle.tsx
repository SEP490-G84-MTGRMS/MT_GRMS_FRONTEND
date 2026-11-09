import type { CSSProperties, FC } from 'react';

interface StatusToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Label bên trái — mặc định "Trạng thái" */
  label?: string;
  /** Text Enable/Disable bên phải */
  showLabel?: boolean;
  style?: CSSProperties;
}

/** Toggle xanh dương giống màn sản phẩm theo NCC / store product. */
export const StatusToggle: FC<StatusToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  label = 'Trạng thái',
  showLabel = true,
  style,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      ...style,
    }}
  >
    {label ? (
      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f766e', minWidth: 72 }}>{label}</span>
    ) : null}
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label || 'Trạng thái'}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 52,
        height: 28,
        borderRadius: 999,
        border: 'none',
        padding: 3,
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: checked ? '#3b82f6' : '#9ca3af',
        opacity: disabled ? 0.6 : 1,
        transition: 'background-color 0.2s ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          display: 'block',
        }}
      />
    </button>
    {showLabel ? (
      <span style={{ fontSize: 13.5, color: checked ? '#0f766e' : '#64748b', fontWeight: 600 }}>
        {checked ? 'Enable' : 'Disable'}
      </span>
    ) : null}
  </div>
);
