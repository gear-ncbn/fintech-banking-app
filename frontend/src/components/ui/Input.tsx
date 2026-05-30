import React, { forwardRef } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  helperText?: string;
  fullWidth?: boolean;
  analyticsId?: string;
  analyticsLabel?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      icon,
      suffix,
      helperText,
      fullWidth = false,
      className = '',
      id,
      required,
      analyticsId,
      analyticsLabel,
      size: _size,
      onFocus,
      onChange,
      ...props
    },
    ref
  ) => {
    // Generate stable ID based on label/name or use provided ID
    const stableId = id || analyticsId || (label && `input-${label.toLowerCase().replace(/\s+/g, '-')}`) || props.name || 'input-field';
    const inputId = stableId;

    const inputClasses = `
      w-full
      px-4 py-2.5
      ${icon ? 'pl-11' : ''}
      rounded-lg
      bg-[var(--input-bg)]
      border border-[var(--border-1)]
      text-[var(--text-1)]
      placeholder:text-[var(--text-2)]
      transition-all duration-200
      focus:outline-none
      focus:ring-2
      focus:ring-[var(--primary-blue)]
      focus:ring-opacity-50
      focus:border-[var(--primary-blue)]
      hover:border-[var(--border-2)]
      ${error ? 'field-error' : ''}
      ${className}
    `;

    const wrapperClasses = `
      ${fullWidth ? 'w-full' : ''}
    `;

    return (
      <div className={wrapperClasses}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--text-1)] mb-1.5"
          >
            {label}
            {required && <span className="field-required" />}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-[var(--text-2)]">{icon}</span>
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            data-testid={stableId}
            className={inputClasses}
            onFocus={(e) => {
              // Log analytics event for focus
              const _fieldLabel = label || analyticsLabel || props.name || 'input';
              const _fieldId = stableId;
              
              // Call original onFocus handler
              if (onFocus) {
                onFocus(e);
              }
            }}
            onChange={(e) => {
              // Log analytics event for change (debounced in real implementation)
              const _fieldLabel = label || analyticsLabel || props.name || 'input';
              const _fieldId = stableId;
              
              // Call original onChange handler
              if (onChange) {
                onChange(e);
              }
            }}
            {...props}
          />
          {suffix && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-[var(--text-2)]">{suffix}</span>
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-[var(--primary-red)]">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-[var(--text-2)]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
