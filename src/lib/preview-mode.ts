/**
 * Local visual preview is deliberately opt-in and can never be enabled by a
 * production build, even if a developer accidentally provides the flag.
 */
export const isUiPreview =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_SUBFLOW_UI_PREVIEW === "true";
