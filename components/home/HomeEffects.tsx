"use client";

import { useEffect } from "react";
import { initHomeEffects } from "@/lib/home-effects";

/** Renders nothing – attaches the scroll/reveal behaviour once the page is interactive. */
export function HomeEffects() {
  useEffect(() => initHomeEffects(), []);
  return null;
}
