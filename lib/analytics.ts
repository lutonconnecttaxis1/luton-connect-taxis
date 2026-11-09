/** Name of the event for a click on a call, WhatsApp, email or quote link – or "" for any other link. */
export function contactEventFor(href: string): string {
  if (href.startsWith("tel:")) return "phone_click";
  if (href.startsWith("mailto:")) return "email_click";
  if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//.test(href)) return "whatsapp_click";
  if (href.includes("#quote")) return "quote_click";
  return "";
}
