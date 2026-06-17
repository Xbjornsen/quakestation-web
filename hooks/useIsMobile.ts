"use client";

import { useEffect, useState } from "react";

// True on small / phone-sized viewports. SSR-safe (false until mounted).
export function useIsMobile(query = "(max-width: 640px)"): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return isMobile;
}
