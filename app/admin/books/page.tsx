"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  getAllBooks, 
  saveBookToStore, 
  deleteBookAction, 
  BookItem 
} from "@/app/actions/book";
import { uploadInline } from "@/app/actions/posts";
import { 
  BookOpen, Plus, Save, Loader2, UploadCloud, 
  CheckCircle2, AlertCircle, X, FileText, 
  Pencil, Trash2, Gift, Link2, DollarSign 
} from "lucide-react";

const toBn = (n: number | string) =>
  n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

async function compressImage(file: File, maxSide = 1200, quality = 0.85): Promise<File> {
  try {
    if (!file.type.startsWith("image/")) return file;
    if (file.size <= 500_000 && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

export default function AdminBooksManager() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingSample, setUploadingSample] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // বইয়ের টাইপ: "PAID" (বিক্রি) | "FREE" (ফ্রি ডাউনলোড) | "AFFILIATE" (রকমারি/বাহিরের লিংক)
  const [bookType, setBookType] = useState<"PAID" | "FREE" | "AFFILIATE">("PAID");

  const [formData, setFormData] = useState<Omit<BookItem, "id">>({
    title: "",
    author: "সাইফুল স্যার",
    category: "HSC",
    coverUrl: "",
    pdfPrice: 50,
    pdfRegularPrice: 100,
    printPrice: 200,
    printRegularPrice: 300,
    pdfDriveUrl: "",
    samplePages: [],
    description: "",
    pageCount: 120,
    publisher: "সাইফুল স্যার পাবলিকেশন্স",
    edition: "২০২৬-২০২৭ সংস্করণ",
    isFree: false,
    isAffiliate: false,
    affiliateUrl: "",
  });

  const coverInputRef = useRef<HTMLInputElement>(null);
  const sampleInputRef = useRef<HTMLInputElement>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  const fetchBooks = () => {
    setLoading(true);
    getAllBooks().then((data) => {
      setBooks(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // ✏️ এডিট মোড চালু করা
  const handleEditBook = (b: BookItem) => {
    setEditingId(b.id);
    let type: "PAID" | "FREE" | "AFFILIATE" = "PAID";
    if (b.isFree) type = "FREE";
    else if (b.isAffiliate) type = "AFFILIATE";
    setBookType(type);

    setFormData({
      title: b.title,
      author: b.author,
      category: b.category,
      coverUrl: b.coverUrl,
      pdfPrice: b.pdfPrice,
      pdfRegularPrice: b.pdfRegularPrice || 0,
      printPrice: b.printPrice || 0,
      printRegularPrice: b.printRegularPrice || 0,
      pdfDriveUrl: b.pdfDriveUrl || "",
      samplePages: b.samplePages || [],
      description: b.description || "",
      pageCount: b.pageCount || 120,
      publisher: b.publisher || "সাইফুল স্যার পাবলিকেশন্স",
      edition: b.edition || "২০২৬-২০২৭ সংস্করণ",
      isFree: b.isFree ?? false,
      isAffiliate: b.isAffiliate ?? false,
      affiliateUrl: b.affiliateUrl || "",
    });

    setShowAddForm(true);
    setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // 🗑️ ডিলিট হ্যান্ডলার
  const handleDeleteBook = async (id: string, title: string) => {
    if (!confirm(`আপনি কি নিশ্চিত যে "${title}" বইটি সম্পূর্ণ মুছে ফেলতে চান?`)) return;

    const res = await deleteBookAction(id);
    if (res.success) {
      setMsg({ type: "success", text: "বইটি সফলভাবে ডিলিট করা হয়েছে!" });
      fetchBooks();
    } else {
      setMsg({ type: "error", text: res.error || "ডিলিট করতে সমস্যা হয়েছে।" });
    }
  };

  // কভার ছবি আপলোড
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const small = await compressImage(file);
      const fd = new FormData();
      fd.set("image", small);
      fd.set("alt", "Book Flat Cover");
      const res = await uploadInline(fd);
      if (res && res.url) {
        setFormData((prev) => ({ ...prev, coverUrl: res.url as string }));
      }
    } catch (err: any) {
      alert("ছবি আপলোড ব্যর্থ: " + err.message);
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  // স্যাম্পল পাতা আপলোড
  const handleSampleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSample(true);
    try {
      const small = await compressImage(file);
      const fd = new FormData();
      fd.set("image", small);
      fd.set("alt", "Sample Page");
      const res = await uploadInline(fd);
      if (res && res.url) {
        setFormData((prev) => ({
          ...prev,
          samplePages: [...(prev.samplePages || []), res.url as string],
        }));
      }
    } catch (err: any) {
      alert("স্যাম্পল পাতা আপলোড ব্যর্থ: " + err.message);
    } finally {
      setUploadingSample(false);
      if (sampleInputRef.current) sampleInputRef.current.value = "";
    }
  };

  const removeSamplePage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      samplePages: prev.samplePages.filter((_, i) => i !== index),
    }));
  };

  // সাবমিট হ্যান্ডলার
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.coverUrl) {
      alert("বইয়ের নাম এবং কভার ছবি বাধ্যতামূলক।");
      return;
    }

    if (bookType === "AFFILIATE" && !formData.affiliateUrl?.trim()) {
      alert("অ্যাফিলিয়েট বইয়ের জন্য রকমারি বা মূল শপের লিংক দেওয়া বাধ্যতামূলক।");
      return;
    }

    if ((bookType === "FREE" || bookType === "PAID") && !formData.pdfDriveUrl.trim()) {
      alert("পিডিএফ ডাউনলোড লিংক দেওয়া বাধ্যতামূলক।");
      return;
    }

    setSaving(true);
    setMsg(null);

    const payload = {
      ...formData,
      isFree: bookType === "FREE",
      isAffiliate: bookType === "AFFILIATE",
      pdfPrice: bookType === "FREE" ? 0 : formData.pdfPrice,
      id: editingId || undefined,
    };

    const res = await saveBookToStore(payload);
    setSaving(false);

    if (res.success) {
      setMsg({ 
        type: "success", 
        text: editingId ? "বইটির তথ্য সফলভাবে আপডেট হয়েছে!" : "নতুন বইটি সফলভাবে বইঘরে যুক্ত হয়েছে!" 
      });
      setShowAddForm(false);
      setEditingId(null);
      fetchBooks();
    } else {
      setMsg({ type: "error", text: res.error || "সংরক্ষণ ব্যর্থ হয়েছে" });
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 font-sans">
      <div ref={formTopRef} className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <BookOpen className="text-blue-600" />
            বইঘর ক্যাটালগ ম্যানেজার
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            বই যোগ, এডিট, ডিলিট, ফ্রি PDF এবং অ্যাফিলিয়েট লিংক নিয়ন্ত্রণ করুন
          </p>
        </div>

        <button
          onClick={() => {
            if (showAddForm) {
              setShowAddForm(false);
              setEditingId(null);
            } else {
              setEditingId(null);
              setFormData({
                title: "",
                author: "সাইফুল স্যার",
                category: "HSC",
                coverUrl: "",
                pdfPrice: 50,
                pdfRegularPrice: 100,
                printPrice: 200,
                printRegularPrice: 300,
                pdfDriveUrl: "",
                samplePages: [],
                description: "",
                pageCount: 120,
                publisher: "সাইফুল স্যার পাবলিকেশন্স",
                edition: "২০২৬-২০২৭ সংস্করণ",
                isFree: false,
                isAffiliate: false,
                affiliateUrl: "",
              });
              setShowAddForm(true);
            }
          }}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
        >
          {showAddForm ? <X size={15} /> : <Plus size={15} />}
          <span>{showAddForm ? "ফর্ম বন্ধ করুন" : "নতুন বই যোগ করুন"}</span>
        </button>
      </div>

      {msg && (
        <div className={`mb-6 p-4 rounded-2xl text-xs font-bold border flex items-center gap-2 ${
          msg.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {msg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* বই যোগ ও এডিট করার ফর্ম */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              {editingId ? "বইয়ের তথ্য সম্পাদন (Edit Book)" : "নতুন বইয়ের বিস্তারিত তথ্য"}
            </h2>
            {editingId && (
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                এডিটিং মোড
              </span>
            )}
          </div>

          {/* 🎯 বইয়ের ধরন নির্বাচন (Paid vs Free vs Affiliate) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">বইয়ের ধরন নির্বাচন করুন:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBookType("PAID")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  bookType === "PAID"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <DollarSign size={14} /> পেইড (বিক্রি)
              </button>

              <button
                type="button"
                onClick={() => setBookType("FREE")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  bookType === "FREE"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Gift size={14} /> সম্পূর্ণ ফ্রি (Free)
              </button>

              <button
                type="button"
                onClick={() => setBookType("AFFILIATE")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  bookType === "AFFILIATE"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Link2 size={14} /> অ্যাফিলিয়েট
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">বইয়ের পুরো নাম *</label>
              <input
                type="text"
                required
                placeholder="যেমন: এইচএসসি ইংলিশ কমপ্লিটিং স্টোরি সাজেশন"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">লেখক / সংকলক *</label>
              <input
                type="text"
                required
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ক্যাটাগরি</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
              >
                <option value="HSC">এইচএসসি (HSC)</option>
                <option value="SSC">এসএসসি (SSC)</option>
                <option value="NTRCA">NTRCA শিক্ষক নিবন্ধন</option>
                <option value="Job">চাকরি ও বিসিএস</option>
                <option value="Note">হ্যান্ডনোট ও শিট</option>
                <option value="English">ইংলিশ গ্রামার</option>
              </select>
            </div>

            {bookType === "PAID" && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">eBook / PDF দাম (৳) *</label>
                  <input
                    type="number"
                    required
                    value={formData.pdfPrice}
                    onChange={(e) => setFormData({ ...formData, pdfPrice: Number(e.target.value) })}
                    className="w-full rounded-xl border border-emerald-300 px-3 py-2 text-xs font-bold text-emerald-700 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hard Copy / প্রিন্ট দাম (৳)</label>
                  <input
                    type="number"
                    value={formData.printPrice}
                    onChange={(e) => setFormData({ ...formData, printPrice: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none"
                  />
                </div>
              </>
            )}

            {bookType === "FREE" && (
              <div className="sm:col-span-2 flex items-center">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 w-full">
                  🎁 এই বইটি ফ্রিতে ডাউনলোড করতে পারবে, কোনো পেমেন্ট বা ঠিকানার প্রয়োজন হবে না।
                </span>
              </div>
            )}
          </div>

          {/* অ্যাফিলিয়েট লিংক ইনপুট */}
          {bookType === "AFFILIATE" && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
              <label className="block text-xs font-bold text-indigo-950 mb-1">
                রকমারি / মূল শপের অ্যাফিলিয়েট লিংক (Affiliate URL) *
              </label>
              <input
                type="url"
                required
                placeholder="https://www.rokomari.com/book/..."
                value={formData.affiliateUrl}
                onChange={(e) => setFormData({ ...formData, affiliateUrl: e.target.value })}
                className="w-full rounded-xl border border-indigo-300 bg-white px-3.5 py-2 text-xs outline-none focus:border-indigo-600 font-mono"
              />
            </div>
          )}

          {/* কভার ছবি আপলোড */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <label className="block text-xs font-bold text-slate-700">বইয়ের ফ্ল্যাট কভার ছবি (মোবাইল গ্যালারি থেকে) *</label>
            <input type="file" ref={coverInputRef} accept="image/*" onChange={handleCoverUpload} className="hidden" />

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={uploadingCover}
                onClick={() => coverInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                {uploadingCover ? <Loader2 size={14} className="animate-spin text-blue-600" /> : <UploadCloud size={14} className="text-blue-600" />}
                <span>{uploadingCover ? "আপলোড হচ্ছে..." : "কভার ছবি বাছুন"}</span>
              </button>

              {formData.coverUrl && (
                <div className="flex items-center gap-2">
                  <div className="relative aspect-[3/4.2] h-12 rounded overflow-hidden border border-slate-300">
                    <Image src={formData.coverUrl} alt="Cover" fill className="object-cover" />
                  </div>
                  <span className="text-[11px] text-emerald-600 font-bold">কভার যুক্ত হয়েছে ✓</span>
                </div>
              )}
            </div>
          </div>

          {/* স্যাম্পল পাতা আপলোড */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
            <label className="block text-xs font-bold text-emerald-900">
              &quot;একটু পড়ে দেখুন&quot; এর জন্য ৪-৫ পৃষ্ঠার স্যাম্পল ছবি আপলোড করুন
            </label>
            <input type="file" ref={sampleInputRef} accept="image/*" onChange={handleSampleUpload} className="hidden" />

            <button
              type="button"
              disabled={uploadingSample}
              onClick={() => sampleInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-4 py-2 text-xs font-bold hover:bg-emerald-700 transition"
            >
              {uploadingSample ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              <span>{uploadingSample ? "পাতা আপলোড হচ্ছে..." : "+ স্যাম্পল পাতা যোগ করুন"}</span>
            </button>

            {formData.samplePages && formData.samplePages.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 pt-2">
                {formData.samplePages.map((url, i) => (
                  <div key={i} className="relative aspect-[3/4.2] h-16 rounded-lg overflow-hidden border border-slate-300 bg-white shadow-xs group">
                    <Image src={url} alt={`Page ${i + 1}`} fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removeSamplePage(i)}
                      className="absolute top-1 right-1 bg-red-600 text-white p-0.5 rounded-full"
                    >
                      <X size={10} />
                    </button>
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center">
                      পাতা {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* সম্পূর্ণ মূল PDF ড্রাইভ লিংক (ফ্রি বা পেইড বইয়ের জন্য) */}
          {bookType !== "AFFILIATE" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {bookType === "FREE" ? "ফ্রি PDF ডাউনলোড লিংক (Google Drive)*" : "পেইড PDF ডাউনলোড লিংক (পেমেন্টের পর পাবে)*"}
              </label>
              <input
                type="url"
                required
                placeholder="https://drive.google.com/file/d/..."
                value={formData.pdfDriveUrl}
                onChange={(e) => setFormData({ ...formData, pdfDriveUrl: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-blue-600 font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">বইয়ের বিবরণ</label>
            <textarea
              rows={3}
              placeholder="বইয়ের বিষয়বস্তু লিখুন..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 py-3 text-xs sm:text-sm font-bold text-white shadow-md transition disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{editingId ? "আপডেট সংরক্ষণ করুন" : "বইটি সংরক্ষণ করুন"}</span>
          </button>
        </form>
      )}

      {/* 📚 বইয়ের তালিকা (স্ক্রিনশটের চিহ্নিত অংশে এডিট ও ডিলিট বাটন সহ) */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : books.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          বইঘরে এখনো কোনো বই যুক্ত করা হয়নি।
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => (
            <div 
              key={b.id} 
              className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between shadow-xs hover:border-slate-300 transition"
            >
              <div className="flex gap-3 items-start">
                <div className="relative aspect-[3/4.2] h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                  <Image src={b.coverUrl} alt={b.title} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    {b.isFree ? (
                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full">
                        ফ্রি PDF
                      </span>
                    ) : b.isAffiliate ? (
                      <span className="text-[9px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.2 rounded-full">
                        অ্যাফিলিয়েট
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-2 py-0.2 rounded-full">
                        পেইড
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{b.title}</h3>
                  <p className="text-[11px] text-slate-500 truncate">{b.author}</p>
                  
                  <div className="mt-1 flex items-center gap-2 text-[11px] font-bold">
                    {b.isFree ? (
                      <span className="text-emerald-600">ফ্রি ডাউনলোড</span>
                    ) : (
                      <>
                        <span className="text-emerald-700">PDF: ৳{toBn(b.pdfPrice)}</span>
                        {b.printPrice ? <span className="text-blue-700">প্রিন্ট: ৳{toBn(b.printPrice)}</span> : null}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 🎯 স্ক্রিনশটের চিহ্নিত অংশে এডিট ও ডিলিট বাটন */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleEditBook(b)}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                >
                  <Pencil size={13} /> এডিট
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteBook(b.id, b.title)}
                  className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
                >
                  <Trash2 size={13} /> ডিলিট
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
