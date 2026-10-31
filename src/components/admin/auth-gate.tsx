"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { LogIn, LoaderCircle, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isUiPreview } from "@/lib/preview-mode";

export function useAdminSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [configurationError, setConfigurationError] = useState("");

  useEffect(() => {
    if (isUiPreview) {
      setLoading(false);
      return;
    }
    let mounted = true;
    try {
      const supabase = createClient();
      void supabase.auth.getSession().then(({ data, error }: { data: { session: Session | null }; error: Error | null }) => {
        if (!mounted) return;
        if (error) setConfigurationError(error.message);
        setSession(data.session);
        setLoading(false);
      });
      const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
        if (mounted) setSession(nextSession);
      });
      return () => {
        mounted = false;
        listener.subscription.unsubscribe();
      };
    } catch (error) {
      window.setTimeout(() => {
        if (!mounted) return;
        setConfigurationError(error instanceof Error ? error.message : "Supabase is not configured.");
        setLoading(false);
      }, 0);
      return () => { mounted = false; };
    }
  }, []);

  return { session, loading, configurationError };
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading, configurationError } = useAdminSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submittingMethod, setSubmittingMethod] = useState<"password" | "google" | null>(null);
  const submitting = submittingMethod !== null;
  const [error, setError] = useState(() => {
    if (typeof window === "undefined") return "";
    const authError = new URLSearchParams(window.location.search).get("auth_error");
    return authError === "oauth_callback_missing_code" ? "Google sign-in did not return an authorization code." : authError ? "Google sign-in could not be completed. Try again." : "";
  });

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("auth_error")) window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const signInWithGoogle = async () => {
    setSubmittingMethod("google");
    setError("");
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: process.env.NEXT_PUBLIC_AUTH_CALLBACK_URL ?? "https://subflow-red.vercel.app/auth/callback",
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setSubmittingMethod(null);
      }
    } catch (oauthError) {
      setError(oauthError instanceof Error ? oauthError.message : "Unable to continue with Google.");
      setSubmittingMethod(null);
    }
  };

  if (isUiPreview) return <>{children}</>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmittingMethod("password");
    setError("");
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) setError(signInError.message);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Unable to sign in.");
    } finally {
      setSubmittingMethod(null);
    }
  };

  if (loading) return <div className="auth-state"><LoaderCircle className="spin" size={22} /><span>Checking your session…</span></div>;
  if (session) return <>{children}</>;

  return <main className="auth-page">
    <section className="auth-card" aria-labelledby="sign-in-title">
      <div className="auth-brand"><span className="brand-mark"><span /></span><span>sub<span className="brand-accent">flow</span></span></div>
      <div className="auth-icon"><LockKeyhole size={20} /></div>
      <h1 id="sign-in-title">Sign in to Subflow</h1>
      <p>Use your Supabase admin or staff account to access subscription operations.</p>
      {configurationError && <div className="auth-error" role="alert">{configurationError}</div>}
      {error && <div className="auth-error" role="alert">{error}</div>}
      <form onSubmit={submit} className="auth-form">
        <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        <button className="button primary auth-submit" disabled={submitting || Boolean(configurationError)}>{submittingMethod === "password" ? <LoaderCircle className="spin" size={17} /> : <LogIn size={17} />}{submittingMethod === "password" ? "Signing in…" : "Sign in"}</button>
      </form>
      <div className="auth-links"><Link href="/forgot-password">Forgot password?</Link></div>
      <div className="auth-divider" aria-hidden="true"><span>or</span></div>
      <button type="button" className="button secondary auth-google" onClick={() => void signInWithGoogle()} disabled={submitting || Boolean(configurationError)}>{submittingMethod === "google" ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <GoogleLogo />}{submittingMethod === "google" ? "Opening Google…" : "Continue with Google"}</button>
      <p className="auth-switch">New to SubFlow? <Link href="/signup">Create an account</Link></p>
    </section>
  </main>;
}

function GoogleLogo() {
  return <svg className="google-logo" viewBox="0 0 24 24" role="img" aria-label="Google"><path fill="#4285F4" d="M21.35 12.27c0-.73-.07-1.43-.2-2.1H12v3.98h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.15c1.84-1.69 2.9-4.18 2.9-7.27Z"/><path fill="#34A853" d="M12 21.9c2.63 0 4.84-.87 6.45-2.36l-3.15-2.45c-.87.58-1.98.92-3.3.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.75 9.75 0 0 0 12 21.9Z"/><path fill="#FBBC05" d="M6.53 13.98A5.86 5.86 0 0 1 6.23 12c0-.69.12-1.36.3-1.98V7.49H3.28A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.03 4.51l3.25-2.53Z"/><path fill="#EA4335" d="M12 5.99c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.07 14.63 2.1 12 2.1a9.75 9.75 0 0 0-8.72 5.39l3.25 2.53C7.3 7.71 9.46 5.99 12 5.99Z"/></svg>;
}
