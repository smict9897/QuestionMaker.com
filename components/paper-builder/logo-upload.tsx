"use client";
import { useState } from "react";
export default function LogoUpload({
  onChange,
}: {
  onChange: (url: string) => void;
}) {
  const [error, setError] = useState("");
  return (
    <div className="my-2">
      <label className="text-xs">
        লোগো আপলোড (PNG/JPEG/WebP, সর্বোচ্চ ২ MB)
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="mt-2 block w-full text-xs"
          onChange={async (e) => {
            setError("");
            const file = e.target.files?.[0];
            if (!file) return;
            if (
              !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
              file.size > 2 * 1024 * 1024
            ) {
              setError("২ MB-এর কম PNG/JPEG/WebP ছবি দিন।");
              return;
            }
            let url = "";
            try {
              url = URL.createObjectURL(file);
              const image = new Image();
              image.src = url;
              await image.decode();
              const canvas = document.createElement("canvas");
              const scale = Math.min(1, 256 / image.width, 256 / image.height);
              canvas.width = Math.max(1, Math.round(image.width * scale));
              canvas.height = Math.max(1, Math.round(image.height * scale));
              canvas
                .getContext("2d")!
                .drawImage(image, 0, 0, canvas.width, canvas.height);
              const encoded = canvas.toDataURL("image/webp", 0.85);
              if (encoded.length > 200000) throw Error();
              onChange(encoded);
            } catch {
              setError("ছবিটি পড়া যায়নি বা আকার বেশি। অন্য ছবি দিন।");
            } finally {
              if (url) URL.revokeObjectURL(url);
              e.target.value = "";
            }
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      <p className="mt-1 text-[10px] text-slate-500">
        ছোট করে প্রশ্নপত্রের সঙ্গে রাখা হবে; কোনো বাইরের সার্ভারে আপলোড হবে না।
      </p>
    </div>
  );
}
