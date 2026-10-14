"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { AutocompleteError, fetchSuggestions, type Suggestion } from "@/lib/maps/autocomplete";
import type { PlaceRef } from "@/lib/journey";

type Props = {
  id: string;
  /** Used for the plain-form fallback: sends `name` (text) and `nameId` (place id). */
  name?: string;
  placeholder?: string;
  /** Text to show at the start (e.g. handed over from the homepage). */
  initialText?: string;
  initialPlaceId?: string;
  /** Called with the chosen place, or null as soon as the person edits the text. */
  onChange?: (place: PlaceRef | null) => void;
  /** Open the suggestion list upwards (for the homepage card, which sits at the bottom of the hero). */
  dropUp?: boolean;
  /** Fetch suggestions straight away for the starting text. */
  openOnMount?: boolean;
  invalid?: boolean;
  describedBy?: string;
  required?: boolean;
};

const MIN_CHARS = 3;
const DEBOUNCE_MS = 220;

/**
 * Address box with Google suggestions. The person must pick a suggestion so we
 * know exactly which place they mean (the server needs its Google place id).
 */
export function PlaceInput({
  id,
  name,
  placeholder,
  initialText = "",
  initialPlaceId,
  onChange,
  dropUp = false,
  openOnMount = false,
  invalid,
  describedBy,
  required,
}: Props) {
  const t = useT();
  const listId = useId();
  const [text, setText] = useState(initialText);
  const [placeId, setPlaceId] = useState(initialPlaceId ?? "");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<"no-key" | "failed" | null>(null);
  const [detail, setDetail] = useState("");
  const session = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const newSession = () => {
    session.current = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
  };

  const search = useCallback((value: string) => {
    if (timer.current) clearTimeout(timer.current);
    abort.current?.abort();
    if (value.trim().length < MIN_CHARS) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const controller = new AbortController();
      abort.current = controller;
      if (!session.current) newSession();
      try {
        const found = await fetchSuggestions(value.trim(), session.current, controller.signal);
        setItems(found);
        setProblem(null);
        setDetail("");
        setActive(-1);
        setOpen(true);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setItems([]);
        setProblem(error instanceof AutocompleteError ? error.kind : "failed");
        setDetail(error instanceof AutocompleteError ? (error.detail ?? "") : "");
        setOpen(true);
      } finally {
        if (abort.current === controller) setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    if (openOnMount && initialText && !initialPlaceId) search(initialText);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      abort.current?.abort();
    };
    // run once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(item: Suggestion) {
    setText(item.text);
    setPlaceId(item.placeId);
    setOpen(false);
    setItems([]);
    setActive(-1);
    newSession(); // a finished choice ends the Google billing session
    onChange?.({ placeId: item.placeId, text: item.text });
  }

  function onInput(value: string) {
    setText(value);
    if (placeId) {
      setPlaceId("");
      onChange?.(null);
    }
    search(value);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!open && items.length > 0) setOpen(true);
      if (items.length === 0) return;
      event.preventDefault();
      setActive((current) => {
        const step = event.key === "ArrowDown" ? 1 : -1;
        return (current + step + items.length) % items.length;
      });
    } else if (event.key === "Enter" && open && active >= 0 && items[active]) {
      event.preventDefault();
      choose(items[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  const showList = open && (items.length > 0 || problem !== null || (!loading && text.trim().length >= MIN_CHARS));

  // A list that opens downwards can end below the screen: scroll just enough to show it.
  useEffect(() => {
    if (!showList || dropUp) return;
    const list = listRef.current;
    if (!list) return;
    const overflow = list.getBoundingClientRect().bottom - window.innerHeight + 16;
    if (overflow > 0) window.scrollBy({ top: overflow, behavior: "smooth" });
  }, [showList, items.length, dropUp]);

  return (
    <div className={`pi${dropUp ? " pi--up" : ""}`}>
      <input
        id={id}
        name={name}
        type="text"
        role="combobox"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={placeholder}
        value={text}
        onChange={(e) => onInput(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => items.length > 0 && !placeId && setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-busy={loading}
        required={required}
        maxLength={300}
      />
      {name && <input type="hidden" name={`${name}Id`} value={placeId} />}
      {placeId && (
        <span className="pi__tick" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
      )}
      {showList && (
        <ul id={listId} ref={listRef} role="listbox" className="pi__list">
          {items.map((item, i) => (
            <li
              key={item.placeId}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`pi__opt${i === active ? " is-active" : ""}`}
              // mouse-down (not click) so the input does not lose focus first
              onMouseDown={(e) => {
                e.preventDefault();
                choose(item);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="pi__main">{item.main}</span>
              {item.secondary && <span className="pi__sub">{item.secondary}</span>}
            </li>
          ))}
          {items.length === 0 && problem === "no-key" && (
            <li className="pi__note" role="presentation">
              {t("quote.place.noKey")}
            </li>
          )}
          {items.length === 0 && problem === "failed" && (
            <li className="pi__note" role="presentation">
              {t("quote.place.failed")}
            </li>
          )}
          {items.length === 0 && problem !== null && process.env.NODE_ENV !== "production" && (
            <li className="pi__dev" role="presentation">
              <strong>Developer note (only you see this while testing):</strong>{" "}
              {problem === "no-key"
                ? "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is empty. Add the browser key to .env.local, then stop and restart npm run dev."
                : detail || "Google refused the request – see the browser console for details."}
            </li>
          )}
          {items.length === 0 && problem === null && (
            <li className="pi__note" role="presentation">
              {t("quote.place.noMatches")}
            </li>
          )}
          {items.length > 0 && (
            <li className="pi__brand" role="presentation">
              {t("quote.place.poweredBy")}
            </li>
          )}
        </ul>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {open && items.length > 0 ? t("quote.place.suggestionsAvailable", { count: items.length }) : ""}
      </span>
    </div>
  );
}
