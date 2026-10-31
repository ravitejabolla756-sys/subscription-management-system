"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { LoaderCircle, Mail } from "lucide-react";
import { AuthError, AuthPage, AuthSuccess } from "@/components/auth/auth-page";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const { error: resetError } = await createClient().auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (resetError) throw resetError;
      setMessage("If an account matches that email, you’ll receive a password reset link shortly.");
    } catch {
      setError("We couldn’t send the reset link. Please try again shortly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPage
      title="Reset your password"
      description="Enter your email and we’ll send instructions to choose a new password."
      footer={<>Remember your password? <Link href="/dashboard">Sign in</Link></>}
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <label>Email address<input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); setMessage(""); }} autoComplete="email" placeholder="you@company.com" required /></label>
        {error && <AuthError>{error}</AuthError>}
        {message && <AuthSuccess><Mail size={15} aria-hidden="true" />{message}</AuthSuccess>}
        <button className="button primary auth-submit" type="submit" disabled={submitting}>{submitting ? <LoaderCircle className="spin" size={17} /> : null}{submitting ? "Sending…" : "Send reset link"}</button>
      </form>
    </AuthPage>
  );
}
