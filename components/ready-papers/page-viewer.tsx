"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
export function PageViewer({
  src,
  page,
  selected,
  onToggle,
  onClose,
}: {
  src: string;
  page: number;
  selected?: boolean;
  onToggle?: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = old;
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      className="rp-viewer"
      onCancel={onClose}
      aria-label={`Page ${page} বড় করে দেখুন`}
    >
      <div className="rp-viewer-bar">
        <strong>Page {page}</strong>
        <button
          onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          disabled={zoom === 1}
          aria-label="Zoom out"
        >
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
          disabled={zoom === 4}
          aria-label="Zoom in"
        >
          +
        </button>
        <button onClick={() => setZoom(1)}>Fit</button>
        {onToggle && (
          <button onClick={onToggle}>
            {selected ? "নির্বাচন বাতিল" : "এই পেজ নির্বাচন"}
          </button>
        )}
        <button onClick={onClose} autoFocus>
          বন্ধ করুন
        </button>
      </div>
      <div className="rp-viewer-scroll">
        <img
          src={src}
          alt={`বড় PDF page ${page}`}
          style={{ width: `${zoom * 100}%` }}
        />
      </div>
    </dialog>,
    document.body,
  );
}
export function PrintFrame({
  children,
  mobileActions,
}: {
  children: ReactNode;
  mobileActions?: ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1),
    [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setFit(Math.min(1, el.clientWidth / ((210 * 96) / 25.4))),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <>
      {mobileActions && (
        <div className="rp-preview-phone-actions rp-toolbar" data-noprint>
          {mobileActions}
        </div>
      )}
      <div
        className={`rp-toolbar${mobileActions ? " rp-preview-desktop-zoom" : ""}`}
        data-noprint
      >
        <span>Preview zoom</span>
        <button
          disabled={zoom <= 1}
          onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
        >
          −
        </button>
        <button onClick={() => setZoom(1)}>Fit</button>
        <button
          disabled={zoom >= 3}
          onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
        >
          +
        </button>
        <span>{Math.round(zoom * 100)}% · প্রিন্টের মাপ বদলাবে না</span>
      </div>
      <div className="rp-print-frame" ref={frame}>
        <div className="rp-preview-scale" style={{ zoom: fit * zoom }}>
          {children}
        </div>
      </div>
    </>
  );
}
