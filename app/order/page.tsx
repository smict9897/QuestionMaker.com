"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
  getPromoSettings, 
  type PromoSettings 
} from "@/app/actions/promo";
import { createBookOrder } from "@/app/actions/order";
import { 
  CheckCircle2, Copy, Check, Download, Package, 
  ShieldCheck, AlertCircle, Loader2, MessageCircle, ArrowLeft 
} from "lucide-react";
import Link from "next/link";

const toBn = (n: number | string) =>
  n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

// 🎯 ডিফল্ট স্টেট পেজের ভেতরে ডিফাইন করা হলো
const fallbackPromoState: PromoSettings = {
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

export default function OrderCheckoutPage() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") === "print" ? "PRINT" : "PDF";

  const [promo, setPromo] = useState<PromoSettings>(fallbackPromoState);
  const [loading, setLoading] = useState(true);
  const [itemType, setItemType] = useState<"PDF" | "PRINT">(initialType);

  // কাস্টমার তথ্য
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("ঢাকা");

  // পেমেন্ট তথ্য
  const [paymentMethod, setPaymentMethod] = useState<"bKash" | "Nagad" | "Rocket">("bKash");
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [copied, setCopied] = useState(false);

  // সাবমিশন স্টেট
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    getPromoSettings()
      .then((data) => {
        if (mounted) setPromo(data || fallbackPromoState);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const itemPrice = itemType === "PDF" ? promo.pdfPrice : promo.printPrice;
  const deliveryFee = itemType === "PDF" ? 0 : district === "ঢাকা" ? 60 : 120;
  const totalAmount = itemPrice + deliveryFee;

  // আপনার একই একক পেমেন্ট নম্বর
  const currentPaymentNumber = promo.bkashNumber || promo.nagadNumber || "01773729897";

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(currentPaymentNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !trxId.trim() || !senderNumber.trim()) {
      setErrorMsg("দয়া করে নাম, ফোন নম্বর, প্রেরক নম্বর ও TrxID পূরণ করুন।");
      return;
    }

    if (itemType === "PRINT" && !address.trim()) {
      setErrorMsg("প্রিন্ট কপির জন্য কুরিয়ার ডেলিভারি ঠিকানা বাধ্যতামূলক।");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const res = await createBookOrder({
      customerName: name.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || phone.trim(),
      itemType,
      itemTitle: promo.title,
      amount: totalAmount,
      deliveryFee,
      deliveryAddress: address.trim(),
      district: itemType === "PRINT" ? district : undefined,
      paymentMethod,
      senderNumber: senderNumber.trim(),
      trxId: trxId.trim(),
    });

    setSubmitting(false);

    if (res.success) {
      setCompletedOrder(res.order);
    } else {
      setErrorMsg(res.error || "অর্ডার সম্পন্ন করতে সমস্যা হয়েছে।");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  // অর্ডার সফল হলে কনফার্মেশন স্লিপ
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
            অর্ডার নম্বর: #{completedOrder.orderNumber}
          </span>

          <h1 className="mt-3 text-2xl font-black text-slate-900">অর্ডারটি সফল হয়েছে!</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            ধন্যবাদ <strong>{completedOrder.customerName}</strong>! আপনার TrxID ({completedOrder.trxId}) টি আমাদের কাছে জমা হয়েছে।
          </p>

          <div className="my-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-left text-xs space-y-2">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">বই / আইটেম:</span>
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
              href="/"
              className="block w-full rounded-2xl bg-slate-100 hover:bg-slate-200 py-3 text-xs font-bold text-slate-700 transition"
            >
              হোমপেজে ফিরে যান
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 py-8 px-4 sm:px-6 font-sans">
      <div className="mx-auto max-w-2xl">
        
        <Link href="/" className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-600 transition">
          <ArrowLeft size={14} /> হোমপেজে ফিরুন
        </Link>

        {/* ১. ফরম্যাট নির্বাচন */}
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            ১. আপনি কীভাবে নিতে চান? (সিলেক্ট করুন)
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div
              onClick={() => setItemType("PDF")}
              className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                itemType === "PDF"
                  ? "border-emerald-500 bg-emerald-50/60 shadow-sm ring-2 ring-emerald-500/20"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <Download size={15} /> ডিজিটাল PDF ই-বুক
                </span>
                <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                  ইনস্ট্যান্ট
                </span>
              </div>
              <div className="text-xl font-black text-slate-900">৳{toBn(promo.pdfPrice)}</div>
              <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                ডেলিভারি চার্জ সম্পূর্ণ ফ্রি (৳০)। টাকা পাঠানো মাত্রই PDF লিংক পাবেন।
              </p>
            </div>

            {promo.allowPrint && (
              <div
                onClick={() => setItemType("PRINT")}
                className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                  itemType === "PRINT"
                    ? "border-blue-500 bg-blue-50/60 shadow-sm ring-2 ring-blue-500/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <Package size={15} /> প্রিন্ট হ্যান্ডনোট শিট
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                    কুরিয়ার কপি
                  </span>
                </div>
                <div className="text-xl font-black text-slate-900">৳{toBn(promo.printPrice)}</div>
                <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                  কুরিয়ারে হোম ডেলিভারি। ডেলিভারি চার্জ প্রযোজ্য।
                </p>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleOrderSubmit} className="space-y-6">
          
          {/* ২. যোগাযোগের তথ্য */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
              ২. আপনার যোগাযোগের তথ্য
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  আপনার পূর্ণ নাম <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মো: আরিফুল ইসলাম"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  মোবাইল নম্বর <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp নম্বর <span className="text-[10px] text-emerald-600 font-normal">(যেখানে সাথে সাথে PDF লিংক পাঠানো হবে)</span>
              </label>
              <input
                type="tel"
                placeholder="01XXXXXXXXX"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-blue-600"
              />
            </div>

            {itemType === "PRINT" && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ডেলিভারি জেলা</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm outline-none"
                  >
                    <option value="ঢাকা">ঢাকা সিটি (ডেলিভারি চার্জ ৳৬০)</option>
                    <option value="ঢাকার বাইরে">ঢাকার বাইরে যেকোনো জেলা (ডেলিভারি চার্জ ৳১২০)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    সম্পূর্ণ কুরিয়ার ঠিকানা <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="বাড়ি নং, রোড নং, থানা, জেলা..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs sm:text-sm outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ৩. পেমেন্ট তথ্য */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>৩. সেন্ড মানি ও পেমেন্ট তথ্য</span>
              <span className="text-emerald-700 text-[11px] font-bold flex items-center gap-1">
                <ShieldCheck size={14} /> নিরাপদ পেমেন্ট
              </span>
            </h2>

            <div className="grid grid-cols-3 gap-2">
              {(["bKash", "Nagad", "Rocket"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    paymentMethod === method
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {method === "bKash" ? "বিকাশ" : method === "Nagad" ? "নগদ" : "রকেট"}
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-amber-50/80 border border-amber-200/90 p-4 space-y-2 text-xs text-amber-950">
              <div className="font-bold text-amber-900">
                📌 কীভাবে সেন্ড মানি করবেন:
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed text-amber-900">
                <li>আপনার {paymentMethod === "bKash" ? "বিকাশ" : paymentMethod === "Nagad" ? "নগদ" : "রকেট"} অ্যাপে যান।</li>
                <li><strong>Send Money (সেন্ড মানি)</strong> অপশন সিলেক্ট করুন।</li>
                <li>নিচের নম্বরে মোট <strong>৳{toBn(totalAmount)}</strong> টাকা সেন্ড মানি করুন।</li>
              </ol>

              <div className="mt-3 flex items-center justify-between rounded-xl bg-white border border-amber-300 p-2.5">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">সেন্ড মানি নম্বর:</span>
                  <span className="font-mono text-sm sm:text-base font-black text-slate-900">{currentPaymentNumber}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyNumber}
                  className="flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-bold transition"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? "কপি হয়েছে!" : "কপি করুন"}</span>
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  যে নম্বর থেকে টাকা পাঠিয়েছেন <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="01XXXXXXXXX"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ট্রানজেকশন আইডি (TrxID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: BKL7X9Q2Z"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-blue-600 font-mono uppercase"
                />
              </div>
            </div>
          </div>

          {/* বিল সামারি ও সাবমিট */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex justify-between text-xs text-slate-600">
              <span>বইয়ের মূল্য ({itemType}):</span>
              <span>৳{toBn(itemPrice)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>ডেলিভারি চার্জ:</span>
              <span className={deliveryFee === 0 ? "text-emerald-600 font-bold" : ""}>
                {deliveryFee === 0 ? "ফ্রি (৳০)" : `৳${toBn(deliveryFee)}`}
              </span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-100 pt-2">
              <span>সর্বমোট পরিশোধ:</span>
              <span className="text-emerald-600 text-xl">৳{toBn(totalAmount)}</span>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-600 font-bold border border-red-200">
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 py-3.5 text-sm font-bold text-white shadow-md transition active:scale-98 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>অর্ডার জমা হচ্ছে...</span>
                </>
              ) : (
                <span>অর্ডার নিশ্চিত করুন (৳{toBn(totalAmount)}) 🚀</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
