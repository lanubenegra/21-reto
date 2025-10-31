"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
};

export function PasswordField({
  label,
  name,
  value,
  onChange,
  autoComplete,
  placeholder,
  className,
}: Props) {
  const [show, setShow] = useState(false);

  return (
    <label className={cn("block space-y-2 text-left", className)}>
      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">{label}</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          name={name}
          autoComplete={autoComplete}
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-[18px] border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-white focus:ring-2 focus:ring-white/50"
        />
        <button
          type="button"
          onClick={() => setShow(prev => !prev)}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}
