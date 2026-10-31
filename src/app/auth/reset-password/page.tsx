"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { AuthError, AuthPage, AuthSuccess } from "@/components/auth/auth-page";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    void createClient().auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (mounted) setReady(Boolean(data.session));
    }).catch(() => {
      if (mounted) setReady(false);
    });
    return () => { mounted = false; };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    if (password !== confirmation) return setError("Passwords do not match.");
    setSubmitting(true);
    setError("");
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess("Your password has been updated. You can now sign in with it.");
      setPassword("");
      setConfirmation("");
    } catch {
      setError("We couldn’t update your password. Request a new reset link and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPage
      title="Choose a new password"
      description="Create a new password for your SubFlow account."
      footer={<>Return to <Link href="/dashboard">sign in</Link></>}
    >
      {!ready ? <AuthError>This reset link is invalid or has expired. Request a new link to continue.</AuthError> : <form className="auth-form" onSubmit={submit} noValidate>
        <label>New password<span className="auth-password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} autoComplete="new-password" placeholder="At least 8 characters" /><button type="button" className="auth-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
        <label>Confirm new password<span className="auth-password-field"><input type={showConfirmation ? "text" : "password"} value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError(""); }} autoComplete="new-password" placeholder="Re-enter your password" /><button type="button" className="auth-password-toggle" onClick={() => setShowConfirmation((visible) => !visible)} aria-label={showConfirmation ? "Hide confirmation password" : "Show confirmation password"}>{showConfirmation ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
        {error && <AuthError>{error}</AuthError>}
        {success && <AuthSuccess>{success}</AuthSuccess>}
        <button className="button primary auth-submit" type="submit" disabled={submitting || Boolean(success)}>{submitting ? <LoaderCircle className="spin" size={17} /> : null}{submitting ? "Updating…" : "Update password"}</button>
      </form>}
    </AuthPage>
  );
}
