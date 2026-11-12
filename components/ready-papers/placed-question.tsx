"use client";
import { useEffect, useRef, useState } from "react";
import {
  placementSize,
  placementAfterResize,
  type ResizeHandle,
  placementAfterDrag,
  placementAfterZoom,
  type Placement,
} from "@/lib/ready-placement";
type Point = { x: number; y: number };
type Gesture = { points: Point[]; value: Placement; handle?: ResizeHandle };
export default function PlacedQuestion({
  src,
  page,
  value,
  movable,
  onChange,
}: {
  src: string;
  page: number;
  value: Placement;
  movable: boolean;
  onChange: (v: Placement) => void;
}) {
  const container = useRef<HTMLDivElement>(null),
    image = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, Point>()),
    gesture = useRef<Gesture | null>(null);
  const [size, setSize] = useState({
    width: 0,
    height: 0,
    imageWidth: 0,
    imageHeight: 0,
  });
  function measure() {
    const c = container.current,
      i = image.current;
    if (c && i)
      setSize({
        width: c.clientWidth,
        height: c.clientHeight,
        imageWidth: i.naturalWidth,
        imageHeight: i.naturalHeight,
      });
  }
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const latest = useRef({ value, onChange, movable });
  latest.current = { value, onChange, movable };
  function emit(next: Placement) {
    latest.current.value = next;
    latest.current.onChange(next);
  }
  function rebase(handle?: ResizeHandle) {
    gesture.current = {
      handle,
      points: [...pointers.current.values()].map((p) => ({ ...p })),
      value: { ...latest.current.value },
    };
  }
  function end(id: number) {
    pointers.current.delete(id);
    if (pointers.current.size) rebase();
    else gesture.current = null;
  }
  useEffect(() => {
    pointers.current.clear();
    gesture.current = null;
  }, [movable, src]);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!latest.current.movable || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      const unit =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
      emit(
        placementAfterZoom(
          latest.current.value,
          Math.exp(-Math.max(-100, Math.min(100, e.deltaY * unit)) * 0.002),
        ),
      );
      if (pointers.current.size) rebase();
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  return (
    <div
      ref={container}
      className={`rp-print-content rp-placed-question${movable ? " rp-placement-active" : ""}`}
      style={{ touchAction: movable ? "none" : "auto" }}
      onPointerDown={(e) => {
        if (
          !movable ||
          (e.pointerType === "mouse" && e.button !== 0) ||
          pointers.current.size >= 2
        )
          return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const handle = (e.target as HTMLElement).closest<HTMLElement>(
          "[data-resize-handle]",
        )?.dataset.resizeHandle as ResizeHandle | undefined;
        rebase(pointers.current.size === 1 ? handle : undefined);
      }}
      onPointerMove={(e) => {
        if (!movable || !pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const start = gesture.current;
        if (!start) return;
        const current = [...pointers.current.values()];
        if (current.length === 2 && start.points.length === 2) {
          const distance = (a: Point, b: Point) =>
            Math.hypot(a.x - b.x, a.y - b.y);
          const before = distance(start.points[0], start.points[1]);
          if (before > 2)
            emit(
              placementAfterZoom(
                start.value,
                distance(current[0], current[1]) / before,
              ),
            );
        } else if (
          current.length === 1 &&
          start.points.length === 1 &&
          image.current
        ) {
          const r = e.currentTarget.getBoundingClientRect();
          emit(
            start.handle
              ? placementAfterResize(
                  start.value,
                  start.handle,
                  current[0].x - start.points[0].x,
                  current[0].y - start.points[0].y,
                  r.width,
                  r.height,
                  image.current.naturalWidth,
                  image.current.naturalHeight,
                )
              : placementAfterDrag(
                  start.value,
                  current[0].x - start.points[0].x,
                  current[0].y - start.points[0].y,
                  r.width,
                  r.height,
                  image.current.naturalWidth,
                  image.current.naturalHeight,
                ),
          );
        }
      }}
      onPointerUp={(e) => end(e.pointerId)}
      onPointerCancel={(e) => end(e.pointerId)}
      onLostPointerCapture={(e) => {
        if (pointers.current.has(e.pointerId)) end(e.pointerId);
      }}
    >
      {(() => {
        const { w, h } = placementSize(
          value,
          size.width,
          size.height,
          size.imageWidth,
          size.imageHeight,
        );
        return (
          <div
            className="rp-question-box"
            style={{
              width: size.width ? `${(w / size.width) * 100}%` : "100%",
              height: size.height ? `${(h / size.height) * 100}%` : "100%",
              left: size.width
                ? `${(((size.width - w) * value.printX) / size.width) * 100}%`
                : 0,
              top: size.height
                ? `${(((size.height - h) * value.printY) / size.height) * 100}%`
                : 0,
            }}
          >
            <img
              ref={image}
              onLoad={measure}
              src={src}
              alt={`সম্পাদিত page ${page}`}
              draggable={false}
              style={{ objectFit: "fill", pointerEvents: "none" }}
            />
            {movable && size.width > 0 && size.imageWidth > 0 && (
              <div data-noprint className="rp-question-selection">
                {(
                  ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as ResizeHandle[]
                ).map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    className={`rp-resize-handle rp-resize-${handle}`}
                    data-resize-handle={handle}
                    aria-label={`Page ${page} resize ${handle}`}
                    title="ধরে টেনে আকার ঠিক করুন"
                    onKeyDown={(e) => {
                      if (
                        ![
                          "ArrowUp",
                          "ArrowDown",
                          "ArrowLeft",
                          "ArrowRight",
                        ].includes(e.key)
                      )
                        return;
                      e.preventDefault();
                      const r = container.current!.getBoundingClientRect();
                      emit(
                        placementAfterResize(
                          value,
                          handle,
                          e.key === "ArrowRight"
                            ? 5
                            : e.key === "ArrowLeft"
                              ? -5
                              : 0,
                          e.key === "ArrowDown"
                            ? 5
                            : e.key === "ArrowUp"
                              ? -5
                              : 0,
                          r.width,
                          r.height,
                          size.imageWidth,
                          size.imageHeight,
                        ),
                      );
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
