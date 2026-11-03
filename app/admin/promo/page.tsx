"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  getPromoSettings, 
  savePromoSettings, 
  type PromoSettings 
} from "@/app/actions/promo";
import { 
  Save, 
  BookOpen, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  DollarSign, 
  PhoneCall, 
  Eye,
  UploadCloud,
  X
} from "lucide-react";

const initialPromoState: PromoSettings = {
  active: true,
  title: "Writing part",
  subtitle: "Paragraph writing",
  description: "Full hand Note",
  badge: "50% Discount",
  coverUrl: "",
  pdfPrice: 50,
  pdfRegularPrice: 100,
  printPrice: 350,
  printRegularPrice: 500,
  pdfDriveUrl: "",
  bkashNumber: "01773729897",
  nagadNumber: "01773729897",
  rocketNumber: "01773729897",
  allowPrint: false,
};

async function compressToWebPBase64(file: File, maxSide = 800, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(e.target?.result as string);
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/webp", quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminPromoPage() {
  const [settings, setSettings] = useState<PromoSettings>(initialPromoState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    getPromoSettings()
      .then((data) => {
        if (mounted) setSettings(data || initialPromoState);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (key: keyof PromoSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setMsg(null);

    try {
      const base64Url = await compressToWebPBase64(file);
      handleChange("coverUrl", base64Url);
      setMsg({ type: "success", text: "কভার ছবি প্রস্তুত হয়েছে! নিচে 'সেভ' বাটনে চাপ দিন।" });
    } catch (err: any) {
      setMsg({ type: "error", text: "ছবি প্রসেস করতে ব্যর্থ: " + err.message });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const res = await savePromoSettings(settings);
      if (res && res.success) {
        setMsg({ type: "success", text: "সফলভাবে সেটিংস সেভ হয়েছে! হোমপেজে পপ-আপ চালু হয়েছে।" });
        alert("✅ সেটিংস সফলভাবে সেভ হয়েছে! হোমপেজে আপডেট দেখতে পাবেন।");
      } else {
        setMsg({ type: "error", text: res?.error || "সেভ ব্যর্থ হয়েছে।" });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "সার্ভার এরর হয়েছে। আবার চেষ্টা করুন।" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 font-sans">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <BookOpen className="text-blue-600" />
            বই ও PDF বিক্রয় কন্ট্রোল প্যানেল
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            হোমপেজের প্রমোশনাল পপ-আপ, কভার ছবি এবং মূল্য নির্ধারণ করুন
          </p>
        </div>

        <Link
          href="/"
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          <Eye size={15} /> হোমপেজে দেখুন
        </Link>
      </div>

      {msg && (
        <div
          className={`mb-6 flex items-center gap-2 rounded-2xl p-4 text-xs font-bold border ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {msg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{msg.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* ১. পপ-আপ অন/অফ সুইচ */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 sm:p-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">হোমপেজ পপ-আপ সক্রিয় রাখুন</h3>
            <p className="text-xs text-slate-600 mt-0.5">অফ করে দিলে হোমপেজে পপ-আপটি আসবে না</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.active}
              onChange={(e) => handleChange("active", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* ২. বই ও কভার ছবি */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <FileText size={18} className="text-blue-600" /> বই ও অফারের তথ্য
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">অফার ব্যাজ (Badge)</label>
              <input
                type="text"
                value={settings.badge}
                onChange={(e) => handleChange("badge", e.target.value)}
                placeholder="50% Discount"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-blue-600"
              />
            </div>

            {/* 📸 গ্যালারি থেকে ছবি আপলোড */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">বইয়ের কভার ছবি (মোবাইল থেকে আপলোড)</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-800 transition disabled:opacity-50"
                >
                  {uploadingImage ? <Loader2 size={16} className="animate-spin text-blue-600" /> : <UploadCloud size={16} className="text-blue-600" />}
                  <span>{uploadingImage ? "ছবি প্রসেস হচ্ছে..." : "গ্যালারি থেকে ছবি বাছুন"}</span>
                </button>

                {settings.coverUrl && (
                  <button
                    type="button"
                    onClick={() => handleChange("coverUrl", "")}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                    title="ছবি রিমুভ করুন"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {settings.coverUrl && (
                <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 w-fit">
                  <div className="relative h-14 w-10 rounded overflow-hidden bg-white border border-slate-300">
                    <Image src={settings.coverUrl} alt="Cover Preview" fill unoptimized className="object-cover" />
                  </div>
                  <span className="text-[11px] text-emerald-600 font-bold">ছবি সিলেক্টেড ✓</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">বই বা অফারের প্রধান শিরোনাম</label>
            <input
              type="text"
              required
              value={settings.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Writing part"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">উপ-শিরোনাম (Subtitle)</label>
            <input
              type="text"
              value={settings.subtitle}
              onChange={(e) => handleChange("subtitle", e.target.value)}
              placeholder="Paragraph writing"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">সংক্ষিপ্ত বিবরণ (Description)</label>
            <textarea
              rows={3}
              value={settings.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Full hand Note"
              className="w-full rounded-xl border border-slate-200 p-3 text-xs sm:text-sm outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* ৩. প্রাইসিং ও ড্রাইভ লিংক */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-600" /> মূল্য নির্ধারণ (PDF ও প্রিন্ট শিট)
          </h2>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                📱 ডিজিটাল PDF ই-বুক (ইনস্ট্যান্ট ডেলিভারি)
              </span>
              <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                প্রধান ফোকাস
              </span>
            </div>

            <div className="grid gap-3 grid-cols-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">PDF অফার মূল্য (৳)</label>
                <input
                  type="number"
                  required
                  value={settings.pdfPrice}
                  onChange={(e) => handleChange("pdfPrice", Number(e.target.value))}
                  className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs sm:text-sm font-bold text-emerald-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">আগের রেগুলার মূল্য (৳)</label>
                <input
                  type="number"
                  value={settings.pdfRegularPrice}
                  onChange={(e) => handleChange("pdfRegularPrice", Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Google Drive / PDF ডাউনলোড লিংক (পেমেন্টের পর ছাত্র পাবে)
              </label>
              <input
                type="url"
                value={settings.pdfDriveUrl}
                onChange={(e) => handleChange("pdfDriveUrl", e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* ৪. পেমেন্ট নম্বর */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <PhoneCall size={18} className="text-pink-600" /> পেমেন্ট নম্বর (যেখানে ছাত্র টাকা পাঠাবে)
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">বিকাশ / নগদ / রকেট সেন্ড মানি নম্বর</label>
            <input
              type="text"
              value={settings.bkashNumber}
              onChange={(e) => {
                const val = e.target.value;
                handleChange("bkashNumber", val);
                handleChange("nagadNumber", val);
              }}
              placeholder="01773729897"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-pink-600 font-mono"
            />
          </div>
        </div>

        {/* সেভ বাটন */}
        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition disabled:opacity-60"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          <span>{saving ? "সেটিংস সেভ হচ্ছে..." : "সেটিংস সেভ ও লাইভ আপডেট করুন"}</span>
        </button>
      </form>
    </div>
  );
                    }
