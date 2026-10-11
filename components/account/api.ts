import { useT } from "@/components/i18n/I18nProvider";
import type { AccountUser } from "@/lib/account";
import { accountMessage } from "@/lib/account-view";

export type Reply = {
  ok?: boolean;
  error?: string;
  hint?: string;
  errors?: Record<string, string>;
  user?: AccountUser | null;
};

/** POSTs JSON to an account route and returns the status and the parsed reply (never throws on bad JSON). */
export async function postJson(url: string, body: Record<string, unknown>): Promise<{ status: number; data: Reply }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: Reply = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

/** Lets the header (and anything else on the page) know the login changed. */
export const announceAuthChange = () => window.dispatchEvent(new Event("lct-auth"));

/** `const message = useAccountMessage(); message(data.error, data.hint)` – an account error code in the visitor's language. */
export function useAccountMessage(): (code: unknown, hint?: unknown) => string {
  const t = useT();
  return (code, hint) => accountMessage(code, hint, t);
}
