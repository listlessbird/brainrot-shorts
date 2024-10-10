import { useCallback, useEffect, useState } from "react";

export function useScroll(threshold: number) {
  const [scrolled, setScrolled] = useState(false);

  const onScroll = useCallback(() => {
    setScrolled(window.scrollY > threshold);
  }, [threshold]);

  useEffect(() => {
    const controller = new AbortController();

    window.addEventListener("scroll", onScroll, {
      signal: controller.signal,
    });

    return () => {
      controller.abort();
    };
  }, [onScroll]);

  useEffect(() => {
    onScroll();
  }, [onScroll]);

  return scrolled;
}
