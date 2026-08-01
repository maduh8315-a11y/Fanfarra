import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  togglePassword?: boolean;
  required?: boolean;
}

export const AuthInput = forwardRef<HTMLInputElement, Props>(
  ({ label, error, togglePassword, required, type, className, ...rest }, ref) => {
    const [show, setShow] = useState(false);
    const actualType = togglePassword ? (show ? "text" : "password") : type;
    return (
      <div className="w-full">
        <label className="block text-sm mb-1.5" style={{ color: "var(--fan-text-2)" }}>
          {label}
          {required && (
            <span style={{ color: "#F87171" }} aria-hidden>
              {" "}*
            </span>
          )}
        </label>
        <div className="relative">
          <input
            ref={ref}
            type={actualType}
            {...rest}
            className={`w-full px-3.5 py-3.5 text-sm rounded-[10px] outline-none transition-colors ${className ?? ""}`}
            style={{
              background: "var(--fan-bg-2)",
              border: `1px solid ${error ? "#F87171" : "var(--fan-rose-mid)"}`,
              color: "var(--fan-text)",
            }}
            onFocus={(e) => {
              if (!error) e.currentTarget.style.borderColor = "var(--fan-pink)";
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              if (!error) e.currentTarget.style.borderColor = "var(--fan-rose-mid)";
              rest.onBlur?.(e);
            }}
          />
          {togglePassword && (
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label={show ? "Ocultar senha" : "Mostrar senha"}
            >
              {show ? <EyeOff size={16} color="var(--fan-text-2)" /> : <Eye size={16} color="var(--fan-text-2)" />}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm" style={{ color: "#F87171" }}>
            {error}
          </p>
        )}
      </div>
    );
  },
);
AuthInput.displayName = "AuthInput";

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.3c-2 1.6-4.5 2.5-7.3 2.5-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.5l6.2 5.3C41.6 35.5 44 30.2 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

export function FanfarraLogo({ size = 22 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--fan-pink-light)">
        <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
      </svg>
      <span style={{ color: "var(--fan-pink-light)", fontWeight: 800, fontSize: size + 2 }}>Fanfarra</span>
    </div>
  );
}
