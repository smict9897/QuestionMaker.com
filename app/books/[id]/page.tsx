"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getBookDetails, BookItem } from "@/app/actions/book";
import { createBookOrder } from "@/app/actions/order";
import { 
  Star, ChevronRight, ChevronLeft, X, Eye, 
  CheckCircle2, Copy, Check, ShieldCheck, 
  Download, Package, Clock, ArrowLeft, Loader2, MessageCircle,
  ExternalLink, Gift
} from "lucide-react";

const toBn = (n: number | string) =>
  n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export default function SingleBookProductPage() {
  const params = useParams();
  const id = params?.id as string;

  const [book, setBook] = useState<BookItem | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [format, setFormat] = useState<"eBook" | "HardCopy">("eBook");
  const [showSampleReader, setShowSampleReader] = useState(false);
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0);

  // পেইড অর্ডারের ফর্ম স্টেট
  const [showOrderBox, setShowOrderBox] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("ঢাকা");
  const [paymentMethod, setPaymentMethod] = useState<"bKash" | "Nagad" | "Rocket">("bKash");
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [activeTab, setActiveTab] = useState<"summary" | "spec">("summary");

  useEffect(() => {
    if (id) {
      getBookDetails(id).then((data) => {
        setBook(data);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="p-12 text-center text-slate-500">
        <h2 className="text-xl font-bold">বইটি খুঁজে পাওয়া যায়নি!</h2>
        <Link href="/books" className="text-blue-600 underline mt-3 inline-block">বইঘরে ফিরে যান</Link>
      </div>
    );
  }

  const currentPrice = format === "eBook" ? book.pdfPrice : (book.printPrice || 200);
  const deliveryFee = format === "eBook" ? 0 : (district === "ঢাকা" ? 60 : 120);
  const totalAmount = currentPrice + deliveryFee;

  const paymentNumber = "01773729897";

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(paymentNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !trxId.trim() || !senderNumber.trim()) {
      setErrorMsg("দয়া করে নাম, ফোন নম্বর, প্রেরক নম্বর ও TrxID পূরণ করুন।");
      return;
    }

    if (format === "HardCopy" && !address.trim()) {
      setErrorMsg("কুরিয়ার ডেলিভারির জন্য ঠিকানা দিন।");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const res = await createBookOrder({
      customerName: name.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || phone.trim(),
      itemType: format === "eBook" ? "PDF" : "PRINT",
      itemTitle: book.title,
      amount: totalAmount,
      deliveryFee,
      deliveryAddress: address.trim(),
      district: format === "HardCopy" ? district : undefined,
      paymentMethod,
      senderNumber: senderNumber.trim(),
      trxId: trxId.trim(),
    });

    setSubmitting(false);

    if (res.success) {
      setCompletedOrder(res.order);
    } else {
      setErrorMsg(res.error || "অর্ডার সম্পন্ন হতে সমস্যা হয়েছে।");
    }
  };

  if (completedOrder) {
    const waText = encodeURIComponent(
      `হ্যালো সাইফুল স্যার, আমি "${completedOrder.itemTitle}" (${completedOrder.itemType}) এর জন্য ${completedOrder.paymentMethod}-এ ৳${completedOrder.amount} পাঠিয়েছি।\nআমার TrxID: ${completedOrder.trxId}\nঅর্ডার নম্বর: #${completedOrder.orderNumber}`
    );

    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 font-sans">
        <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={36} />
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            অর্ডার নং: #{completedOrder.orderNumber}
          </span>
          <h1 className="mt-3 text-2xl font-black text-slate-900">অর্ডারটি সফল হয়েছে!</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            ধন্যবাদ <strong>{completedOrder.customerName}</strong>! আপনার TrxID ({completedOrder.trxId}) টি আমাদের কাছে জমা হয়েছে।
          </p>

          <div className="my-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-left text-xs space-y-2">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">বইয়ের নাম:</span>
              <span className="font-bold text-slate-900">{completedOrder.itemTitle} ({completedOrder.itemType})</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">পরিশোধিত টাকা:</span>
              <span className="font-bold text-emerald-600 text-sm">৳{toBn(completedOrder.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">পেমেন্ট মেথড:</span>
              <span className="font-bold text-slate-800">{completedOrder.paymentMethod} (TrxID: {completedOrder.trxId})</span>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href={`https://wa.me/8801773729897?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3.5 text-xs sm:text-sm font-bold text-white shadow-md transition"
            >
              <MessageCircle size={18} />
              <span>WhatsApp-এ মেসেজ দিয়ে দ্রুত PDF নিন</span>
            </a>
            <Link
              href="/books"
              className="block w-full rounded-2xl bg-slate-100 hover:bg-slate-200 py-3 text-xs font-bold text-slate-700 transition"
            >
              আরও বই দেখুন
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa] pb-24 font-sans text-slate-800">
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 text-xs text-slate-500">
        <div className="mx-auto max-w-5xl flex items-center gap-1.5 truncate">
          <Link href="/" className="hover:text-blue-600">হোম</Link>
          <span>/</span>
          <Link href="/books" className="hover:text-blue-600">বইঘর</Link>
          <span>/</span>
          <span className="text-slate-800 font-bold truncate">{book.title}</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-xs grid gap-8 md:grid-cols-12 items-start">
          
          {/* কভার ও ডেমো পাতা */}
          <div className="md:col-span-5 flex flex-col items-center">
            {book.samplePages && book.samplePages.length > 0 && (
              <button
                onClick={() => {
                  setCurrentSampleIndex(0);
                  setShowSampleReader(true);
                }}
                className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3.5 py-1 text-xs font-black text-emerald-700 transition shadow-xs animate-bounce"
              >
                <Eye size={14} />
                <span>একটু পড়ে দেখুন ⤓</span>
              </button>
            )}

            <div 
              onClick={() => {
                if (book.samplePages && book.samplePages.length > 0) {
                  setCurrentSampleIndex(0);
                  setShowSampleReader(true);
                }
              }}
              className="relative aspect-[3/4.2] w-48 sm:w-64 overflow-hidden rounded-2xl bg-slate-100 shadow-md border border-slate-200 cursor-pointer group"
            >
              <Image
                src={book.coverUrl || "/placeholder.jpg"}
                alt={book.title}
                fill
                priority
                sizes="(max-width: 640px) 200px, 280px"
                className="object-cover group-hover:scale-102 transition-transform duration-300"
              />
            </div>
          </div>

          {/* বইয়ের বিবরণ ও অ্যাকশন */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                {book.isFree ? (
                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Gift size={11} /> সম্পূর্ণ ফ্রি PDF
                  </span>
                ) : book.isAffiliate ? (
                  <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ExternalLink size={11} /> রকমারি / অ্যাফিলিয়েট
                  </span>
                ) : (
                  <span className="bg-[#0284c7] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    eBook
                  </span>
                )}
                <span className="text-xs text-slate-500 font-medium">ক্যাটাগরি: {book.category}</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {book.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                লেখক: <span className="font-bold text-blue-700">{book.author}</span>
              </p>
            </div>

            {/* রেটিং */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" />
                ))}
              </div>
              <span className="font-bold text-slate-700">{book.rating || 4.9}</span>
              <span className="text-slate-400">({toBn(book.reviewCount || 25)} রিভিউ)</span>
            </div>

            {/* 🎯 ১. যদি বইটি সম্পূর্ণ ফ্রি (FREE) হয় */}
            {book.isFree && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                <div className="text-emerald-900 font-bold text-sm flex items-center gap-2">
                  <Gift size={18} className="text-emerald-600" />
                  <span>এই বইটি সবার জন্য সম্পূর্ণ বিনামূল্যে উন্মুক্ত!</span>
                </div>
                <p className="text-xs text-emerald-700">
                  কোনো ঠিকানা বা পেমেন্টের প্রয়োজন নেই। নিচের বাটনে চাপ দিয়ে সরাসরি আপনার ডিভাইসে ডাউনলোড করে নিন।
                </p>

                <a
                  href={book.pdfDriveUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3.5 text-sm sm:text-base font-bold text-white shadow-md transition active:scale-98"
                >
                  <Download size={18} />
                  <span>সম্পূর্ণ বিনামূল্যে PDF ডাউনলোড করুন</span>
                </a>
              </div>
            )}

            {/* 🎯 ২. যদি বইটি অ্যাফিলিয়েট (AFFILIATE) হয় */}
            {book.isAffiliate && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 space-y-3">
                <div className="text-indigo-950 font-bold text-sm flex items-center gap-2">
                  <ExternalLink size={18} className="text-indigo-600" />
                  <span>অফিসিয়াল পার্টনার শপ থেকে সংগ্রহ করুন</span>
                </div>
                <p className="text-xs text-indigo-700">
                  রকমারি বা মূল অনলাইন শপ থেকে আসল প্রিন্টেড বইটি সরাসরি অর্ডার করতে নিচের বাটনে চাপুন।
                </p>

                <a
                  href={book.affiliateUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 py-3.5 text-sm sm:text-base font-bold text-white shadow-md transition active:scale-98"
                >
                  <span>রকমারি / মূল শপ থেকে কিনুন</span>
                  <ExternalLink size={16} />
                </a>
              </div>
            )}

            {/* 🎯 ৩. যদি বইটি পেইড (PAID) হয় */}
            {!book.isFree && !book.isAffiliate && (
              <>
                <div className="border-y border-slate-100 py-3">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">
                    TK. {toBn(currentPrice)}
                  </div>
                  <p className="text-xs text-emerald-600 font-bold mt-1">
                    ⚡ {format === "eBook" ? "কোনো ডেলিভারি চার্জ নেই (ইনস্ট্যান্ট ডাউনলোড)" : "কুরিয়ারে হোম ডেলিভারি"}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">ফরম্যাট নির্বাচন করুন:</label>
                  <div className="grid grid-cols-2 gap-3 max-w-sm">
                    <button
                      type="button"
                      onClick={() => setFormat("eBook")}
                      className={`rounded-xl border p-2.5 text-left transition ${
                        format === "eBook" ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20" : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs font-bold text-blue-900 flex items-center justify-between">
                        <span>eBook (PDF)</span>
                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                      </div>
                      <div className="text-sm font-black text-slate-900 mt-1">Tk. {toBn(book.pdfPrice)}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormat("HardCopy")}
                      className={`rounded-xl border p-2.5 text-left transition ${
                        format === "HardCopy" ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20" : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>Hard Copy (প্রিন্ট)</span>
                        {format === "HardCopy" && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                      </div>
                      <div className="text-sm font-black text-slate-900 mt-1">Tk. {toBn(book.printPrice || 200)}</div>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowOrderBox(!showOrderBox)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] py-3.5 text-sm sm:text-base font-bold text-white shadow-md transition active:scale-98"
                >
                  <span>{format === "eBook" ? "Buy eBook (অর্ডার করুন)" : "Buy Hard Copy (অর্ডার করুন)"}</span>
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* 🛒 পেইড বইয়ের জন্য চেকআউট বক্স */}
        {!book.isFree && !book.isAffiliate && showOrderBox && (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-lg">
            <h2 className="text-base sm:text-lg font-black text-slate-900 border-b border-slate-100 pb-3 mb-4">
              অর্ডার ও সেন্ড মানি তথ্য সম্পন্ন করুন
            </h2>

            <form onSubmit={handleOrderSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">আপনার নাম *</label>
                  <input
                    type="text"
                    required
                    placeholder="নাম লিখুন"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নম্বর *</label>
                  <input
                    type="tel"
                    required
                    placeholder="01XXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp নম্বর (যেখানে PDF লিংক পাঠানো হবে) *</label>
                <input
                  type="tel"
                  required
                  placeholder="01XXXXXXXXX"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-blue-600"
                />
              </div>

              {format === "HardCopy" && (
                <div className="space-y-3 pt-1 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ডেলিভারি জেলা</label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs outline-none"
                    >
                      <option value="ঢাকা">ঢাকা সিটি (ডেলিভারি চার্জ ৳৬০)</option>
                      <option value="ঢাকার বাইরে">ঢাকার বাইরে (ডেলিভারি চার্জ ৳১২০)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">কুরিয়ার ঠিকানা *</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="বিস্তারিত ঠিকানা..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2 text-xs text-amber-950">
                <div className="font-bold text-amber-900">📌 সেন্ড মানি নির্দেশাবলী:</div>
                <p className="text-[11px] leading-relaxed">
                  আপনার বিকাশ, নগদ বা রকেট অ্যাপে গিয়ে <strong>Send Money</strong> করুন। নিচে দেওয়া নম্বরে মোট <strong>৳{toBn(totalAmount)}</strong> টাকা পাঠাবেন:
                </p>
                <div className="flex items-center justify-between rounded-xl bg-white border border-amber-300 p-2.5">
                  <span className="font-mono text-sm sm:text-base font-black text-slate-900">{paymentNumber}</span>
                  <button
                    type="button"
                    onClick={handleCopyNumber}
                    className="flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 text-xs font-bold transition"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? "কপি হয়েছে!" : "নম্বর কপি"}</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">যে নম্বর থেকে টাকা পাঠিয়েছেন *</label>
                  <input
                    type="tel"
                    required
                    placeholder="01XXXXXXXXX"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-blue-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ট্রানজেকশন আইডি (TrxID) *</label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: BKL7X9Q2Z"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-blue-600 font-mono uppercase"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3.5 text-sm font-bold text-white shadow-md transition disabled:opacity-60"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                <span>অর্ডার কনফার্ম করুন (সর্বমোট: ৳{toBn(totalAmount)})</span>
              </button>
            </form>
          </div>
        )}

        {/* সারসংক্ষেপ ও স্পেসিফিকেশন */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
          <div className="flex border-b border-slate-200 gap-4 text-xs sm:text-sm font-bold mb-4">
            <button
              onClick={() => setActiveTab("summary")}
              className={`pb-2 border-b-2 transition ${
                activeTab === "summary" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"
              }`}
            >
              বইয়ের সারসংক্ষেপ
            </button>
            <button
              onClick={() => setActiveTab("spec")}
              className={`pb-2 border-b-2 transition ${
                activeTab === "spec" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"
              }`}
            >
              স্পেসিফিকেশন
            </button>
          </div>

          {activeTab === "summary" ? (
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              <p>{book.description || "এই বইটিতে রয়েছে সম্পূর্ণ সিলেবাসভিত্তিক প্রয়োজনীয় অধ্যায়সমূহ ও স্পেশাল সমাধান।"}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">বইয়ের নাম:</span>
                <span className="font-bold text-slate-900">{book.title}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">লেখক:</span>
                <span className="font-bold text-slate-900">{book.author}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">মোট পৃষ্ঠা:</span>
                <span className="font-bold text-slate-900">{toBn(book.pageCount || 120)} পৃষ্ঠা</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* স্যাম্পল পাতা দেখার মডাল */}
      {showSampleReader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-emerald-400" />
                <span className="text-xs font-bold truncate max-w-[200px]">
                  একটু পড়ে দেখুন: {book.title}
                </span>
              </div>
              <button onClick={() => setShowSampleReader(false)} className="p-1 text-slate-300">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center bg-slate-100 min-h-[360px]">
              {book.samplePages && book.samplePages.length > 0 ? (
                <div className="relative aspect-[3/4.2] w-full max-w-[280px] overflow-hidden rounded-xl shadow-lg border border-slate-300 bg-white">
                  <Image
                    src={book.samplePages[currentSampleIndex]}
                    alt={`Sample Page ${currentSampleIndex + 1}`}
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-500">কোনো স্যাম্পল পাতা নেই।</p>
              )}
            </div>

            {book.samplePages && book.samplePages.length > 0 && (
              <div className="bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between text-xs">
                <button
                  disabled={currentSampleIndex === 0}
                  onClick={() => setCurrentSampleIndex((prev) => Math.max(0, prev - 1))}
                  className="flex items-center gap-1 font-bold text-slate-700 disabled:opacity-30"
                >
                  <ChevronLeft size={16} /> আগের পাতা
                </button>
                <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  পাতা: {toBn(currentSampleIndex + 1)} / {toBn(book.samplePages.length)}
                </span>
                <button
                  disabled={currentSampleIndex === book.samplePages.length - 1}
                  onClick={() => setCurrentSampleIndex((prev) => Math.min(book.samplePages.length - 1, prev + 1))}
                  className="flex items-center gap-1 font-bold text-slate-700 disabled:opacity-30"
                >
                  পরের পাতা <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
