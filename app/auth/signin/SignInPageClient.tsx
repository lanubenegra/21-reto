"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { signIn, getProviders, type ClientSafeProvider } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, X, ChevronRight, Loader2, MailCheck, Inbox, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PasswordField } from "@/components/forms/PasswordField";
import TurnstileBox from "@/components/security/TurnstileBox";

type Mode = "login" | "register" | "forgot";

const SEGMENTS: Array<{ key: Mode; label: string }> = [
  { key: "login", label: "Iniciar sesión" },
  { key: "register", label: "Regístrate" },
  { key: "forgot", label: "Recuperar acceso" },
];

const PROVIDER_ORDER = ["google", "azure-ad", "apple", "facebook"] as const;

type ProviderButtonMeta = {
  label: string;
  helper?: string;
  icon: ReactNode;
  buttonClass: string;
  iconClass?: string;
};

const PROVIDER_META: Record<string, ProviderButtonMeta> = {
  google: {
    label: "Google",
    helper: "Accede con tu cuenta",
    buttonClass: "bg-white text-[#111827] hover:bg-white/90 focus:ring-white/50",
    iconClass: "border-[#E5E7EB] bg-white",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.6 2.8-4 2.8-6.8 0-.6-.1-1.2-.2-1.8H12z" />
        <path fill="#34A853" d="M5.3 14.3l-.9.7L2 17.6C3.8 20.9 7.6 23 12 23c2.7 0 4.9-.9 6.6-2.4l-3.1-2.4c-.9.6-2 1-3.5 1-2.7 0-5-1.8-5.8-4.3z" />
        <path fill="#4A90E2" d="M18.6 20.6C20.3 19.1 21.4 16.7 21.4 14c0-.6-.1-1.2-.2-1.8H12v3.6h5.1c-.2 1.2-.9 2.3-1.9 3z" />
        <path fill="#FBBC05" d="M5.3 14.3c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2l-3.3-2.5C1.4 8.9 1 10.4 1 12c0 1.6.4 3.1 1 4.5l3.3-2.2z" />
        <path fill="#EA4335" d="M12 4.5c1.5 0 2.9.5 3.9 1.5l2.9-2.9C16.9 1.2 14.7.3 12 .3 7.6.3 3.8 2.4 2 5.7l3.3 2.5C5.9 5.7 8.3 4.5 12 4.5z" />
      </svg>
    ),
  },
  "azure-ad": {
    label: "Microsoft",
    helper: "Microsoft 365",
    buttonClass: "bg-white text-[#0F172A] hover:bg-white/90 focus:ring-white/45",
    iconClass: "border-[#E0E7FF] bg-white",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#2563EB">
        <path d="M3 4.5A2.5 2.5 0 0 1 5.5 2h6v9h-9v-6.5Z" opacity=".6" />
        <path d="M3 11h9v11H5.5A2.5 2.5 0 0 1 3 19.5V11Z" opacity=".9" />
        <path d="M13.5 2H18.5C19.88 2 21 3.12 21 4.5V11h-7.5V2Z" opacity=".8" />
        <path d="M21 13.5V19.5A2.5 2.5 0 0 1 18.5 22H13.5V13.5H21Z" />
      </svg>
    ),
  },
  apple: {
    label: "Apple",
    helper: "Usa tu Apple ID",
    buttonClass: "bg-black text-white hover:bg-black/80 focus:ring-white/35",
    iconClass: "border-transparent bg-black",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="white">
        <path d="M19.665 16.136c-.262.596-.384.837-.717 1.35-.465.712-1.122 1.598-1.936 1.592-.724-.005-.956-.469-1.938-.464-.982.005-1.228.47-1.953.464-.814-.006-1.436-.809-1.9-1.52-1.303-1.974-1.44-3.825-1.27-4.38.114-.365.317-.7.584-.963.483-.474 1.086-.366 1.513-.369.739-.006 1.204-.424 1.905-.418.703.006 1.109.418 1.906.412.4-.003.819-.205 1.29-.582.492-.393.834-.949 1.026-1.563-1.57-.676-3.21-.51-4.275.286-.477.35-.84.801-1.085 1.352-.442.99-.5 2.383.31 3.774.234.403.548.85.95 1.339.4.487.87 1.035 1.5 1.026.6-.01.984-.335 1.473-.335.49 0 .83.337 1.496.327.625-.01 1.058-.498 1.456-.987.457-.55.646-1.08.735-1.347-.019-.008-1.404-.539-1.423-2.14-.01-1.34 1.095-1.977 1.145-2.008-.632-.923-1.612-1.035-1.952-1.057-.86-.068-1.576.3-1.994.3-.417 0-1.049-.29-1.729-.281-.888.013-1.716.517-2.176 1.32-.929 1.61-.237 3.982.667 5.286.444.644.978 1.365 1.668 1.352.667-.013.918-.435 1.932-.43 1.013.005 1.237.43 1.935.419.79-.013 1.291-.871 1.735-1.517-.051-.03-1.379-.806-1.368-2.472.01-1.58 1.291-2.334 1.351-2.37-.742-1.085-1.979-1.104-2.329-1.116-.872-.034-1.712.502-2.153.502-.439 0-1.126-.49-1.891-.476-.96.018-1.843.563-2.338 1.43-.999 1.744-.257 4.287.73 5.705.455.662 1.067 1.403 1.83 1.388.7-.013.968-.451 1.93-.447.96.004 1.208.449 1.906.438.775-.013 1.288-.782 1.742-1.443.303-.436.559-.9.766-1.388-.02-.01-1.346-.638-1.33-2.28.01-1.41 1.1-2.094 1.15-2.124-.674-.986-1.724-1.1-2.079-1.123Z" />
      </svg>
    ),
  },
  facebook: {
    label: "Facebook",
    helper: "Ingresa con Facebook",
    buttonClass: "bg-[#1877F2] text-white hover:bg-[#165fd1] focus:ring-[#7DB2FF]/40",
    iconClass: "border-[#0f5bd0] bg-[#1455c1]",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M22.675 0H1.325C.593 0 0 .593 0 1.326v21.348C0 23.406.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.794.143v3.24l-1.918.001c-1.504 0-1.796.715-1.796 1.764v2.314h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.406 24 22.674V1.326C24 .593 23.406 0 22.675 0Z" />
      </svg>
    ),
  },
};

export default function SignInPageClient() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>((searchParams.get("mode") as Mode) ?? "login");
  const [providers, setProviders] = useState<Record<string, ClientSafeProvider> | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "",
    region: "",
    token: "",
    newPassword: "",
    newPasswordConfirm: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const processedHash = useRef(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [captchaTokens, setCaptchaTokens] = useState<{ register: string | null; forgot: string | null; login: string | null }>({
    register: null,
    forgot: null,
    login: null,
  });
  const [loginFailures, setLoginFailures] = useState(0);
  const [tokenPrefilled, setTokenPrefilled] = useState(false);
  const [showPostResetGuide, setShowPostResetGuide] = useState(false);
  const [showPostRegisterGuide, setShowPostRegisterGuide] = useState(false);

  const hasTurnstile = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const showLoginCaptcha = hasTurnstile && loginFailures >= 2;

  useEffect(() => {
    getProviders().then(setProviders);
  }, []);

  useEffect(() => {
    const param = (searchParams.get("mode") as Mode) ?? "login";
    setMode(param);
  }, [searchParams]);

  useEffect(() => {
    if (mode !== "login") {
      setShowPostResetGuide(false);
      setShowPostRegisterGuide(false);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "forgot") {
      setShowResetForm(false);
    }
  }, [mode]);

  useEffect(() => {
    if (processedHash.current) return;
    if (typeof window === "undefined") return;
    const rawHash = window.location.hash;
    if (!rawHash || rawHash.length <= 1) return;
    const hashParams = new URLSearchParams(rawHash.slice(1));
    const typeParam = hashParams.get("type");
    const tokenParam = hashParams.get("access_token");
    if (typeParam !== "recovery" || !tokenParam) return;

    processedHash.current = true;
    setMode("forgot");
    setShowResetForm(true);
    setFormState(prev => ({
      ...prev,
      token: tokenParam,
      email:
        hashParams.get("email") ??
        new URL(window.location.href).searchParams.get("email") ??
        prev.email,
    }));
    setTokenPrefilled(true);
    setMessage("Ingresa tu nueva contraseña para completar el restablecimiento.");

    const url = new URL(window.location.href);
    url.hash = "";
    window.history.replaceState(null, "", url.toString());
  }, []);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setMode("forgot");
      setFormState(prev =>
        prev.token === tokenParam ? prev : { ...prev, token: tokenParam }
      );
      const emailParam = searchParams.get("email");
      if (emailParam) {
        setFormState(prev => ({ ...prev, email: emailParam }));
      }
      setShowResetForm(true);
      setTokenPrefilled(true);
      setMessage("Ingresa tu nueva contraseña para completar el restablecimiento.");
    }
  }, [searchParams]);

  useEffect(() => {
    const verifiedParam = searchParams.get("verified");
    if (verifiedParam === "1") {
      setMode("login");
      setMessage("¡Correo verificado! Inicia sesión para continuar.");
    }
  }, [searchParams]);

  const oauthProviders = useMemo(() => {
    if (!providers) return [] as ClientSafeProvider[];
    return PROVIDER_ORDER.map(id => providers[id]).filter(Boolean) as ClientSafeProvider[];
  }, [providers]);

  const onInputChange = (field: keyof typeof formState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState(prev => ({ ...prev, [field]: event.target.value }));
  };

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (showLoginCaptcha && !captchaTokens.login) {
      setMessage("Completa la verificación de seguridad.");
      return;
    }
    setPending(true);
    setMessage(null);
    const result = await signIn("credentials", {
      email: formState.email,
      password: formState.password,
      redirect: false,
      cfToken: captchaTokens.login ?? undefined,
    });
    setPending(false);
    if (result?.ok) {
      setLoginFailures(0);
      setCaptchaTokens(prev => ({ ...prev, login: null }));
      window.location.href = "/";
    } else {
      const error = result?.error ?? "";
      if (error === "captcha_failed") {
        setLoginFailures(prev => Math.max(prev + 1, 2));
        setMessage("Completa la verificación de seguridad.");
      } else if (error === "rate_limited") {
        setLoginFailures(prev => prev + 1);
        setMessage("Demasiados intentos. Intenta nuevamente en un minuto.");
      } else if (error === "email_not_confirmed") {
        setLoginFailures(prev => prev + 1);
        setMessage("Revisa tu correo y confirma tu cuenta.");
      } else {
        setLoginFailures(prev => prev + 1);
        setMessage("Correo o contraseña no válidos o sin confirmar.");
      }
      setCaptchaTokens(prev => ({ ...prev, login: null }));
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const trimmedName = formState.name.trim();
    if (trimmedName.length < 2) {
      setMessage("Ingresa tu nombre completo (2 caracteres o más).");
      return;
    }
    if (!termsAccepted) {
      setMessage("Debes aceptar los Términos y la Política de Privacidad.");
      return;
    }
    if (hasTurnstile && !captchaTokens.register) {
      setMessage("Completa la verificación de seguridad.");
      return;
    }
    if (formState.password !== formState.confirmPassword) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    if (
      formState.password.length < 10 ||
      !/[A-Za-z]/.test(formState.password) ||
      !/\d/.test(formState.password)
    ) {
      setMessage("La contraseña debe tener al menos 10 caracteres, combinando letras y números.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: formState.email,
          password: formState.password,
          confirmPassword: formState.confirmPassword,
          country: formState.country,
          region: formState.region,
          consent: termsAccepted,
          captchaToken: captchaTokens.register,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 201 || response.status === 202) {
        setMessage(
          data?.message ??
            "Te enviamos un correo para confirmar tu cuenta. Revísalo antes de iniciar sesión."
        );
        setShowPostRegisterGuide(true);
        setShowPostResetGuide(false);
        setMode("login");
        return;
      }
      if (response.ok) {
        setMessage(data?.message ?? "Listo. Revisa tu correo para continuar.");
        setShowPostRegisterGuide(true);
        setShowPostResetGuide(false);
        setMode("login");
        return;
      }
      setMessage(data?.message ?? "No fue posible crear la cuenta.");
    } finally {
      setPending(false);
      setCaptchaTokens(prev => ({ ...prev, register: null }));
    }
  }

  async function handleForgot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasTurnstile && !captchaTokens.forgot) {
      setMessage("Completa la verificación de seguridad.");
      return;
    }
    setPending(true);
    setMessage(null);
    const response = await fetch("/api/auth/reset-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formState.email, captchaToken: captchaTokens.forgot }),
    });
    setPending(false);
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setMessage(
        data?.message ??
          "Si tu correo existe, te enviamos un enlace para crear una nueva contraseña."
      );
    } else {
      setMessage(data?.message ?? "No fue posible generar la solicitud");
    }
    setCaptchaTokens(prev => ({ ...prev, forgot: null }));
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (formState.newPassword !== formState.newPasswordConfirm) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    if (
      formState.newPassword.length < 10 ||
      !/[A-Za-z]/.test(formState.newPassword) ||
      !/\d/.test(formState.newPassword)
    ) {
      setMessage("La nueva contraseña debe tener al menos 10 caracteres con letras y números.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/me/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: formState.token, password: formState.newPassword }),
      });
      if (response.ok) {
        setMessage("Contraseña actualizada. Antes de continuar, revisa estas indicaciones.");
        setShowPostResetGuide(true);
        setLoginFailures(2);
        setMode("login");
        setFormState(prev => ({ ...prev, newPassword: "", newPasswordConfirm: "", token: "" }));
      } else {
        const data = await response.json();
        setMessage(data.message ?? "Token inválido o expirado.");
      }
    } finally {
      setPending(false);
    }
  }

  const renderDivider = (label: string) => (
    <div className="flex items-center gap-3 pt-4 text-xs uppercase tracking-[0.35em] text-white/50">
      <span className="h-px flex-1 bg-white/15" />
      {label}
      <span className="h-px flex-1 bg-white/15" />
    </div>
  );

  const socialButtons = oauthProviders.map(provider => {
    const meta =
      PROVIDER_META[provider.id] ??
      ({
        label: provider.name,
        icon: <ShieldCheck className="h-5 w-5" />,
        buttonClass: "bg-white/12 text-white hover:bg-white/20 focus:ring-white/35",
        iconClass: "border-white/20 bg-white/10",
      } satisfies ProviderButtonMeta);
    const isLoading = loadingProvider === provider.id;

    return (
      <button
        key={provider.id}
        type="button"
        onClick={() => {
          if (isLoading) return;
          setLoadingProvider(provider.id);
          signIn(provider.id, { callbackUrl: "/" }).finally(() => setLoadingProvider(null));
        }}
        className={cn(
          "flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 text-sm font-medium shadow-[0_20px_48px_-32px_rgba(5,10,32,0.9)] transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-75",
          meta.buttonClass
        )}
        aria-label={`Continuar con ${meta.label}`}
        disabled={isLoading}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-base",
              meta.iconClass
            )}
            aria-hidden
          >
            {meta.icon}
          </span>
          <span className="flex min-w-0 flex-col text-left leading-tight">
            <span className="truncate text-base font-semibold">{meta.label}</span>
            {meta.helper && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.34em] opacity-70">{meta.helper}</span>
            )}
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/10 text-white/80" aria-hidden>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>
    );
  });

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#08112e] via-[#0d1738] to-[#08112e] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_55%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-[32px] border border-white/15 bg-[#0b1635]/95 p-9 shadow-[0_40px_90px_-35px_rgba(5,9,27,0.85)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="mana-gradient flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/75">Devocional Maná</p>
                <h1 className="font-display text-[28px] font-semibold leading-tight text-white">Tu casa para avanzar cada día</h1>
              </div>
            </div>
            <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20" aria-label="Volver al inicio">
              <X className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-white/80">
            Entra con correo o con tus cuentas favoritas. Siempre sincronizamos tus 21 retos para que sigas creciendo.
          </p>

          <div className="mt-6 flex rounded-full border border-white/20 bg-white/10 p-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white">
            {SEGMENTS.map(segment => (
              <button
                key={segment.key}
                type="button"
                className={`flex-1 rounded-full px-3 py-1 transition ${
                  mode === segment.key ? "bg-white text-[#0b1635]" : "text-white/70 hover:bg-white/15"
                }`}
                onClick={() => {
                  setMode(segment.key);
                  setMessage(null);
                  setShowPostResetGuide(false);
                  setShowPostRegisterGuide(false);
                }}
              >
                {segment.label}
              </button>
            ))}
          </div>

          {message && <p className="mt-5 rounded-[18px] bg-white/10 px-4 py-2 text-sm text-white">{message}</p>}

          {mode === "login" && showPostRegisterGuide && (
            <div className="mt-5 rounded-[24px] border border-white/20 bg-white/10 p-5 text-sm text-white/85 shadow-[0_28px_60px_-36px_rgba(5,12,45,0.85)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mana-primary/20 text-mana-primary">
                    <MailCheck className="h-6 w-6" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-white">Confirma tu nuevo acceso</p>
                    <p className="text-white/75">
                      Asegúrate de seguir estos pasos para que tu cuenta quede lista antes de iniciar sesión.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPostRegisterGuide(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
                  aria-label="Ocultar recomendaciones"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-white/80 sm:space-y-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-mana-primary">
                    <MailCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  <div className="space-y-1.5">
                    <p className="font-semibold text-white">Abre el correo de bienvenida</p>
                    <p>
                      Busca el mensaje con el asunto <span role="img" aria-label="brillo">✨</span>{" "}
                      <strong>Estás a un clic de comenzar…</strong> y toca el botón “Confirmar mi cuenta”.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-mana-primary">
                    <Inbox className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  <div className="space-y-1.5">
                    <p className="font-semibold text-white">¿No lo encuentras?</p>
                    <p>
                      Revisa las carpetas <strong>Spam</strong>, <strong>Promociones</strong> o{" "}
                      <strong>Correo no deseado</strong>. Si lo ves allí, márcalo como <em>No es spam</em> para recibir
                      los próximos correos sin retrasos.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-mana-primary">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  <div className="space-y-1.5">
                    <p className="font-semibold text-white">Inicia sesión después de confirmar</p>
                    <p>
                      Cuando el botón del correo diga que tu cuenta fue activada, regresa aquí y usa tu correo y
                      contraseña. Si lo prefieres, puedes cerrar esta guía cuando ya lo tengas todo listo.
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPostRegisterGuide(false)}
                className="mt-5 w-full rounded-[16px] border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 sm:mt-6"
              >
                Entendido, ya revisé mi correo
              </button>
            </div>
          )}

          {mode === "login" && showPostResetGuide && (
            <div className="mt-5 rounded-[24px] border border-white/20 bg-white/10 p-5 text-sm text-white/85 shadow-[0_28px_60px_-36px_rgba(5,12,45,0.85)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mana-primary/20 text-mana-primary">
                    <ShieldCheck className="h-6 w-6" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-white">Tu nueva contraseña quedó activa</p>
                    <p className="text-white/75">
                      Antes de volver a entrar, sigue estos pasos sencillos para que el sistema reconozca que eres tú.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPostResetGuide(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
                  aria-label="Ocultar recomendaciones"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-white/80 sm:space-y-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-mana-primary">
                    <MailCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  <div className="space-y-1.5">
                    <p className="font-semibold text-white">Confirma el correo de seguridad</p>
                    <p>
                      Revisa tu bandeja de entrada por el mensaje con asunto <span role="img" aria-label="candado">🔐</span> Clave actualizada. Ábrelo y, si tu correo lo permite, marca a Devocional Maná como remitente seguro o confirma que fuiste tú.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-mana-primary">
                    <Inbox className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  <div className="space-y-1.5">
                    <p className="font-semibold text-white">¿No lo ves?</p>
                    <p>
                      Busca en <strong>Spam</strong> o <strong>Correo no deseado</strong>. Si está allí, muévelo a tu bandeja principal y presiona “No es spam” para que futuros mensajes lleguen directo.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-mana-primary">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  <div className="space-y-1.5">
                    <p className="font-semibold text-white">Verificación final al ingresar</p>
                    <p>
                      Al regresar aquí verás un cuadro llamado <strong>Verificación de seguridad</strong>. Es nuestro aliado contra los robots: solo pulsa el botón y sigue las indicaciones para terminar.
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPostResetGuide(false)}
                className="mt-5 w-full rounded-[16px] border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 sm:mt-6"
              >
                Entendido, quiero iniciar sesión
              </button>
            </div>
          )}

          {mode === "login" && (
            <div className="mt-6 space-y-5">
              <form className="space-y-4" onSubmit={handleEmailLogin}>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white">Correo</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={formState.email}
                    onChange={onInputChange("email")}
                    className="mt-1 w-full rounded-[18px] border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-white focus:ring-2 focus:ring-white/50"
                    placeholder="tu@email.com"
                  />
                </div>
                <PasswordField
                  label="Contraseña"
                  name="password"
                  value={formState.password}
                  onChange={value => setFormState(prev => ({ ...prev, password: value }))}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                {showLoginCaptcha && (
                  <div className="rounded-[18px] border border-white/20 bg-white/5 px-4 py-3">
                    <TurnstileBox
                      action="login"
                      onVerify={token =>
                        setCaptchaTokens(prev => ({ ...prev, login: token ? token : null }))
                      }
                      onExpire={() => setCaptchaTokens(prev => ({ ...prev, login: null }))}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-white/75">
                  <button type="button" className="text-white underline" onClick={() => setMode("forgot")}>
                    ¿Olvidaste tu contraseña?
                  </button>
                  <span>
                    ¿No tienes cuenta?{" "}
                    <button type="button" className="text-white underline" onClick={() => setMode("register")}>
                      Regístrate
                    </button>
                  </span>
                </div>
                <Button type="submit" className="w-full rounded-[18px] bg-mana-primary text-white hover:bg-mana-primaryDark" disabled={pending}>
                  {pending ? "Ingresando..." : "Iniciar sesión"}
                </Button>
              </form>

              {oauthProviders.length > 0 && (
                <div className="space-y-3">
                  {renderDivider("O continúa con")}
                  <div className="grid gap-3">{socialButtons}</div>
                </div>
              )}
            </div>
          )}

          {mode === "register" && (
            <div className="mt-6 space-y-5">
              <form className="space-y-4" onSubmit={handleRegister}>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white">Nombre completo</label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={onInputChange("name")}
                    className="mt-1 w-full rounded-[18px] border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-white focus:ring-2 focus:ring-white/50"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white">Correo</label>
                  <input
                    type="email"
                    required
                    value={formState.email}
                    onChange={onInputChange("email")}
                    className="mt-1 w-full rounded-[18px] border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-white focus:ring-2 focus:ring-white/50"
                    placeholder="tu@email.com"
                  />
                </div>
                <PasswordField
                  label="Contraseña"
                  name="password"
                  value={formState.password}
                  onChange={value => setFormState(prev => ({ ...prev, password: value }))}
                  autoComplete="new-password"
                  placeholder="Mínimo 10 caracteres (letras y números)"
                />
                <PasswordField
                  label="Confirma tu contraseña"
                  name="confirmPassword"
                  value={formState.confirmPassword}
                  onChange={value => setFormState(prev => ({ ...prev, confirmPassword: value }))}
                  autoComplete="new-password"
                  placeholder="Repite tu contraseña"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white">País</label>
                    <input
                      type="text"
                      required
                      value={formState.country}
                      onChange={onInputChange("country")}
                      className="mt-1 w-full rounded-[18px] border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-white focus:ring-2 focus:ring-white/50"
                      placeholder="Colombia"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white">Estado / Región</label>
                    <input
                      type="text"
                      required
                      value={formState.region}
                      onChange={onInputChange("region")}
                      className="mt-1 w-full rounded-[18px] border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-white focus:ring-2 focus:ring-white/50"
                      placeholder="Antioquia"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-3 text-xs text-white/80">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={event => setTermsAccepted(event.target.checked)}
                    className="h-4 w-4 rounded border-white/30 bg-transparent"
                  />
                  <span>
                    Acepto los{" "}
                    <Link href="/terminos" className="underline">
                      Términos
                    </Link>{" "}
                    y la{" "}
                    <Link href="/privacidad" className="underline">
                      Política de Privacidad
                    </Link>
                  </span>
                </label>
                {hasTurnstile && (
                  <div className="rounded-[18px] border border-white/20 bg-white/5 px-4 py-3">
                    <TurnstileBox
                      action="register"
                      onVerify={token =>
                        setCaptchaTokens(prev => ({ ...prev, register: token ? token : null }))
                      }
                      onExpire={() => setCaptchaTokens(prev => ({ ...prev, register: null }))}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-white/75">
                  <button type="button" className="text-white underline" onClick={() => setMode("login")}>
                    ¿Ya tienes cuenta?
                  </button>
                  <span>
                    ¿Recordaste tu contraseña?{" "}
                    <button type="button" className="text-white underline" onClick={() => setMode("login")}>
                      Inicia sesión
                    </button>
                  </span>
                </div>
                <Button type="submit" className="w-full rounded-[18px] bg-mana-primary text-white hover:bg-mana-primaryDark" disabled={pending}>
                  {pending ? "Creando..." : "Crear cuenta"}
                </Button>
              </form>

              {oauthProviders.length > 0 && (
                <div className="space-y-3">
                  {renderDivider("O regístrate con")}
                  <div className="grid gap-3">{socialButtons}</div>
                </div>
              )}
            </div>
          )}

          {mode === "forgot" && (
            <div className="mt-6 space-y-5">
              {!showResetForm && (
                <div className="space-y-4">
                  <form className="space-y-4" onSubmit={handleForgot}>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white">Correo</label>
                      <input
                        type="email"
                        required
                        value={formState.email}
                        onChange={onInputChange("email")}
                        className="mt-1 w-full rounded-[18px] border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-white focus:ring-2 focus:ring-white/50"
                        placeholder="tu@email.com"
                      />
                    </div>
                    {hasTurnstile && (
                      <div className="rounded-[18px] border border-white/20 bg-white/5 px-4 py-3">
                        <TurnstileBox
                          action="forgot"
                          onVerify={token =>
                            setCaptchaTokens(prev => ({ ...prev, forgot: token ? token : null }))
                          }
                          onExpire={() => setCaptchaTokens(prev => ({ ...prev, forgot: null }))}
                        />
                      </div>
                    )}
                    <Button type="submit" className="w-full rounded-[18px] bg-mana-primary text-white hover:bg-mana-primaryDark" disabled={pending}>
                      {pending ? "Enviando..." : "Enviar instrucciones"}
                    </Button>
                  </form>
                <button
                  type="button"
                  className="w-full rounded-[18px] border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                  onClick={() => {
                    setShowResetForm(true);
                    setMessage("Pega el token que recibiste y crea tu nueva contraseña.");
                    setTokenPrefilled(false);
                    setFormState(prev => ({ ...prev, token: "", newPassword: "", newPasswordConfirm: "" }));
                  }}
                >
                  Ya tengo el token, crear nueva contraseña
                </button>
                </div>
              )}

              {showResetForm && (
                <form className="space-y-3 rounded-[20px] bg-white/8 p-4 text-sm text-white/80" onSubmit={handleReset}>
                  {tokenPrefilled ? (
                    <>
                      <input type="hidden" value={formState.token} readOnly />
                      <div className="rounded-[18px] border border-white/20 bg-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
                        Enlace validado
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white">Código del enlace</label>
                      <input
                        required
                        value={formState.token}
                        onChange={onInputChange("token")}
                        className="mt-1 w-full rounded-[18px] border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-white focus:ring-2 focus:ring-white/50"
                        placeholder="Pega el código que recibiste"
                      />
                    </div>
                  )}
                  <PasswordField
                    label="Nueva contraseña"
                    name="newPassword"
                    value={formState.newPassword}
                    onChange={value => setFormState(prev => ({ ...prev, newPassword: value }))}
                    autoComplete="new-password"
                    placeholder="Mínimo 10 caracteres"
                  />
                  <PasswordField
                    label="Confirma tu contraseña"
                    name="newPasswordConfirm"
                    value={formState.newPasswordConfirm}
                    onChange={value => setFormState(prev => ({ ...prev, newPasswordConfirm: value }))}
                    autoComplete="new-password"
                    placeholder="Repite tu contraseña"
                  />
                  <Button type="submit" className="w-full rounded-[18px] bg-mana-primary text-white hover:bg-mana-primaryDark" disabled={pending}>
                    {pending ? "Actualizando..." : "Actualizar contraseña"}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-center text-xs text-white/70 underline"
                    onClick={() => {
                      setShowResetForm(false);
                      setMessage(null);
                    }}
                  >
                    Volver a solicitar el enlace
                  </button>
                </form>
              )}

              <p className="text-xs text-white/75">
                ¿Recordaste tu acceso?{" "}
                <button type="button" className="text-white underline" onClick={() => setMode("login")}>
                  Inicia sesión
                </button>
              </p>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between text-xs text-white/60">
            <Link href="/" className="text-white underline">
              Volver al inicio
            </Link>
            <span>© {new Date().getFullYear()} Devocional Maná</span>
          </div>
        </div>
      </div>
    </div>
  );
}
