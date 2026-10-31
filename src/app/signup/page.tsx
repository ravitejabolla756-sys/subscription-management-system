"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthError, AuthPage } from "@/components/auth/auth-page";

// Public registration stays disabled until the backend provides a trusted
// default-role and customer-provisioning workflow.
const PUBLIC_SIGNUP_ENABLED = false;

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!PUBLIC_SIGNUP_ENABLED) return;
    if (!name.trim()) return setError("Enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setError("Enter a valid email address.");
    if (password.length < 8)
      return setError("Use at least 8 characters for your password.");
    if (password !== confirmation)
      return setError("Passwords do not match.");
  };

  return (
    <AuthPage
      title="Create your SubFlow account"
      description="Get started with a simpler way to manage subscriptions."
      footer={<>Already have an account? <Link href="/dashboard">Sign in</Link></>}
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <label>Full name<input value={name} onChange={(event) => { setName(event.target.value); setError(""); }} autoComplete="name" placeholder="Your full name" disabled={!PUBLIC_SIGNUP_ENABLED} /></label>
        <label>Email address<input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} autoComplete="email" placeholder="you@company.com" disabled={!PUBLIC_SIGNUP_ENABLED} /></label>
        <label>Password<span className="auth-password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} autoComplete="new-password" placeholder="At least 8 characters" disabled={!PUBLIC_SIGNUP_ENABLED} /><button type="button" className="auth-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} disabled={!PUBLIC_SIGNUP_ENABLED}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
        <label>Confirm password<span className="auth-password-field"><input type={showConfirmation ? "text" : "password"} value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError(""); }} autoComplete="new-password" placeholder="Re-enter your password" disabled={!PUBLIC_SIGNUP_ENABLED} /><button type="button" className="auth-password-toggle" onClick={() => setShowConfirmation((visible) => !visible)} aria-label={showConfirmation ? "Hide confirmation password" : "Show confirmation password"} disabled={!PUBLIC_SIGNUP_ENABLED}>{showConfirmation ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
        {error && <AuthError>{error}</AuthError>}
        {!PUBLIC_SIGNUP_ENABLED && <AuthError>Account creation is temporarily unavailable while secure customer provisioning is being completed. Please contact your administrator.</AuthError>}
        <button className="button primary auth-submit" type="submit" disabled={!PUBLIC_SIGNUP_ENABLED}>Create account</button>
      </form>
    </AuthPage>
  );
}
