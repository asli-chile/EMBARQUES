import { useCallback, useEffect, useRef, useState } from "react";

type ScrollEdges = {
  showTopFade: boolean;
  showBottomFade: boolean;
};

export function useSidebarScrollIndicators(syncKey: string | number) {
  const scrollRef = useRef<HTMLElement | null>(null);
  const [edges, setEdges] = useState<ScrollEdges>({
    showTopFade: false,
    showBottomFade: false,
  });

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const epsilon = 3;
    const overflowY = scrollHeight > clientHeight + epsilon;
    setEdges({
      showTopFade: overflowY && scrollTop > epsilon,
      showBottomFade: overflowY && scrollTop + clientHeight < scrollHeight - epsilon,
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    update();

    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(() => {
      update();
    });
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  useEffect(() => {
    const id = requestAnimationFrame(() => update());
    return () => cancelAnimationFrame(id);
  }, [syncKey, update]);

  return { scrollRef, ...edges };
}
