"use client";

import { FormEvent, useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { LogIn, LoaderCircle, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function useAdminSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [configurationError, setConfigurationError] = useState("");

  useEffect(() => {
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) setError(signInError.message);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
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
        <button className="button primary auth-submit" disabled={submitting || Boolean(configurationError)}>{submitting ? <LoaderCircle className="spin" size={17} /> : <LogIn size={17} />}{submitting ? "Signing in…" : "Sign in"}</button>
      </form>
    </section>
  </main>;
}
