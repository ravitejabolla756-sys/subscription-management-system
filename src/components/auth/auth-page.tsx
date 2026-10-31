"use client";

import Link from "next/link";

export function AuthPage({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-page-title">
        <Link className="auth-brand" href="/dashboard" aria-label="SubFlow home">
          <span className="brand-mark"><span /></span>
          <span>sub<span className="brand-accent">flow</span></span>
        </Link>
        <h1 id="auth-page-title">{title}</h1>
        <p>{description}</p>
        {children}
        {footer && <div className="auth-switch">{footer}</div>}
      </section>
    </main>
  );
}

export function AuthError({ children }: { children: React.ReactNode }) {
  return <div className="auth-error" role="alert">{children}</div>;
}

export function AuthSuccess({ children }: { children: React.ReactNode }) {
  return <div className="auth-success" role="status">{children}</div>;
}
