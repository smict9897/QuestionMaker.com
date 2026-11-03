"use client";

import React, { useState, useEffect } from "react";
import { getAdminOrders, updateOrderStatus } from "@/app/actions/order";
import { 
  Package, 
  CheckCircle2, 
  Clock, 
  MessageCircle, 
  Loader2, 
  RefreshCcw, 
  Phone 
} from "lucide-react";

// 🎯 export বাদ দিয়ে সাধারণ ফাংশন করা হলো যাতে Next.js এরর না দেয়
const toBn = (n: number | string) =>
  n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => {
    setLoading(true);
    getAdminOrders().then((res) => {
      if (res.success) setOrders(res.orders || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await updateOrderStatus(orderId, newStatus);
    fetchOrders();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 font-sans">
      <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Package className="text-blue-600" />
            অর্ডার ও TrxID ভেরিফিকেশন প্যানেল
          </h1>
          <p className="text-xs text-slate-500 mt-1">শিক্ষার্থীদের দেওয়া পেমেন্ট TrxID মিলিয়ে অর্ডার কনফার্ম করুন</p>
        </div>

        <button
          onClick={fetchOrders}
          className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          <RefreshCcw size={14} /> রিফ্রেশ
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          এখনো কোনো নতুন অর্ডার আসেনি।
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">অর্ডার নং</th>
                <th className="py-3 px-4">শিক্ষার্থীর নাম ও ফোন</th>
                <th className="py-3 px-4">আইটেম</th>
                <th className="py-3 px-4">টাকা</th>
                <th className="py-3 px-4">পেমেন্ট মেথড ও TrxID</th>
                <th className="py-3 px-4">স্ট্যাটাস</th>
                <th className="py-3 px-4 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-bold text-blue-700">#{o.orderNumber}</td>
                  
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{o.customerName}</div>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                      <Phone size={10} /> {o.phone}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      o.itemType === "PDF" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {o.itemType}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-black text-slate-900">৳{toBn(o.amount)}</td>

                  {/* বিকাশ/নগদ এসএমএস মেলানোর TrxID */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-800">{o.paymentMethod}</div>
                    <div className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                      {o.trxId}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">প্রেরক: {o.senderNumber}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] ${
                      o.status === "VERIFIED"
                        ? "bg-emerald-100 text-emerald-700"
                        : o.status === "CANCELLED"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {o.status === "VERIFIED" ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                      {o.status === "VERIFIED" ? "কনফার্মড" : o.status === "CANCELLED" ? "বাতিল" : "পেন্ডিং"}
                    </span>
                  </td>

                  {/* এক ক্লিকে WhatsApp বাটন */}
                  <td className="py-3.5 px-4 text-right space-x-1">
                    <a
                      href={`https://wa.me/88${o.whatsapp?.replace(/\D/g, "") || o.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `হ্যালো ${o.customerName}, SaifulSir.com থেকে আপনার অর্ডার #${o.orderNumber} এর TrxID (${o.trxId}) ভেরিফাই হয়েছে। ধন্যবাদ!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-bold text-[11px]"
                      title="WhatsApp এ মেসেজ দিন"
                    >
                      <MessageCircle size={12} /> WhatsApp
                    </a>

                    {o.status !== "VERIFIED" && (
                      <button
                        onClick={() => handleStatusChange(o.id, "VERIFIED")}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-lg font-bold text-[11px]"
                      >
                        কনফার্ম
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
