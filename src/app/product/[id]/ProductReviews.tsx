"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Review = { id: string; author_name: string; rating: number; body: string; image_url?: string | null; answer?: string | null; answered_at?: string | null; created_at: string };
type Question = { id: string; author_name: string; body: string; answer?: string | null; answered_at?: string | null; created_at: string };

const fieldClass = "w-full rounded-xl border border-[#f0e8e0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#E8845A]";

export default function ProductReviews({ productId }: { productId: string }) {
  const [mode, setMode] = useState<"reviews" | "questions">("reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionForm, setQuestionForm] = useState({ name: "", email: "", body: "" });
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetch(`/api/products/${productId}/reviews`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/products/${productId}/questions`, { cache: "no-store" }).then((r) => r.json()),
      supabase?.auth.getSession(),
    ]).then(([reviewData, questionData, session]) => {
      setReviews(Array.isArray(reviewData.reviews) ? reviewData.reviews : []);
      setQuestions(Array.isArray(questionData.questions) ? questionData.questions : []);
      const user = session?.data.session?.user;
      if (user) setQuestionForm((form) => ({
        ...form,
        name: String(user.user_metadata?.name || form.name || user.email?.split("@")[0] || ""),
        email: String(form.email || user.email || ""),
      }));
    });
  }, [productId]);

  const average = useMemo(() => reviews.length ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length : 0, [reviews]);
  const sendQuestion = async () => {
    if (sending) return;
    setSending(true); setError(""); setSent(false);
    const session = supabase ? await supabase.auth.getSession() : null;
    const response = await fetch(`/api/products/${productId}/questions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(session?.data.session?.access_token ? { authorization: `Bearer ${session.data.session.access_token}` } : {}) },
      body: JSON.stringify(questionForm),
    });
    const payload = await response.json().catch(() => ({}));
    setSending(false);
    if (!response.ok) { setError(payload.error || "Не удалось отправить вопрос"); return; }
    setQuestionForm((form) => ({ ...form, body: "" }));
    setSent(true);
  };

  return <div className="grid lg:grid-cols-[260px_1fr] gap-6">
    <aside className="bg-[#fdf8f5] rounded-3xl p-6 h-fit">
      <p className="text-5xl font-black mb-3">{average ? average.toFixed(1) : "—"}</p>
      <div className="flex gap-1 mb-2">{[1,2,3,4,5].map((star) => <Star key={star} size={22} className={star <= Math.round(average) ? "fill-[#E8845A] text-[#E8845A]" : "text-[#e4ddd8]"} />)}</div>
      <p className="text-sm text-[#6b6b6b]">{reviews.length ? `${reviews.length} ${reviews.length === 1 ? "отзыв" : "отзывов"}` : "Отзывов пока нет"}</p>
      <Link href="/account" className="mt-6 w-full inline-flex justify-center rounded-2xl border border-[#E8845A] text-[#E8845A] font-semibold text-sm px-4 py-3 hover:bg-[#fff1e9]">Написать отзыв</Link>
      <p className="mt-3 text-xs text-[#8b6b5d] leading-relaxed">Отзывы могут оставить только покупатели из личного кабинета. За отзыв — 20 бонусов.</p>
    </aside>
    <div>
      <div className="flex rounded-2xl bg-[#f5f2ef] p-1 mb-5 w-fit">
        <button onClick={() => setMode("reviews")} className={`px-5 py-2.5 rounded-xl text-sm font-semibold ${mode === "reviews" ? "bg-white shadow-sm text-[#E8845A]" : "text-[#6b6b6b]"}`}>Отзывы {reviews.length}</button>
        <button onClick={() => setMode("questions")} className={`px-5 py-2.5 rounded-xl text-sm font-semibold ${mode === "questions" ? "bg-white shadow-sm text-[#E8845A]" : "text-[#6b6b6b]"}`}>Вопросы {questions.length}</button>
      </div>
      {mode === "reviews" ? <div className="space-y-4">{reviews.length ? reviews.map((review) => <article key={review.id} className="border border-[#f0e8e0] rounded-2xl p-5"><div className="flex items-center justify-between gap-4 mb-3"><div className="flex gap-1">{[1,2,3,4,5].map((star) => <Star key={star} size={16} className={star <= review.rating ? "fill-[#E8845A] text-[#E8845A]" : "text-[#e4ddd8]"} />)}</div><time className="text-xs text-[#aaa]">{new Date(review.created_at).toLocaleDateString("ru-RU")}</time></div><p className="text-sm leading-relaxed">{review.body}</p>{review.image_url && <img src={review.image_url} alt="Фото к отзыву" className="mt-4 max-w-xs rounded-xl" />}{review.answer && <div className="mt-4 rounded-xl bg-[#fdf8f5] border border-[#f5e6dc] p-4"><p className="text-xs font-bold text-[#E8845A] uppercase tracking-wide">Ответ взБАДрись</p><p className="mt-2 text-sm leading-relaxed">{review.answer}</p></div>}<p className="mt-4 text-xs text-[#aaa]">{review.author_name}</p></article>) : <p className="text-sm text-[#6b6b6b] bg-[#fdf8f5] rounded-2xl p-5">Будьте первой, кто поделится впечатлением о товаре.</p>}</div> : <div><div className="space-y-3 mb-5">{questions.length ? questions.map((item) => <article key={item.id} className="border border-[#f0e8e0] rounded-2xl p-4"><p className="text-sm">{item.body}</p>{item.answer && <div className="mt-4 pt-4 border-t border-[#f0e8e0]"><p className="text-xs font-bold text-[#E8845A] uppercase tracking-wide">Ответ взБАДрись</p><p className="mt-2 text-sm leading-relaxed">{item.answer}</p></div>}<p className="mt-3 text-xs text-[#aaa]">{item.author_name} · {new Date(item.created_at).toLocaleDateString("ru-RU")}</p></article>) : <p className="text-sm text-[#6b6b6b] bg-[#fdf8f5] rounded-2xl p-5">Пока нет опубликованных вопросов. Спросите первой.</p>}</div><div className="rounded-2xl bg-[#fdf8f5] p-4"><label className="flex items-center gap-2 text-sm font-semibold mb-3"><MessageCircle size={16} className="text-[#E8845A]" /> Задать вопрос</label><div className="grid sm:grid-cols-2 gap-3 mb-3"><input value={questionForm.name} onChange={(event) => setQuestionForm((form) => ({ ...form, name: event.target.value }))} placeholder="Как вас зовут" className={fieldClass} /><input type="email" value={questionForm.email} onChange={(event) => setQuestionForm((form) => ({ ...form, email: event.target.value }))} placeholder="Ваш e-mail" className={fieldClass} /></div><textarea value={questionForm.body} onChange={(event) => setQuestionForm((form) => ({ ...form, body: event.target.value }))} rows={3} placeholder="Напишите ваш вопрос о товаре" className={fieldClass} /><button onClick={() => void sendQuestion()} disabled={sending} className="mt-3 px-5 py-2.5 rounded-xl bg-[#E8845A] text-white text-sm font-semibold disabled:opacity-60">{sending ? "Отправляем…" : "Отправить вопрос"}</button>{sent && <p className="mt-3 text-xs text-green-700">Спасибо! Мы ответим, и вопрос с ответом появится здесь.</p>}{error && <p className="mt-3 text-xs text-red-500">{error}</p>}</div></div>}
    </div>
  </div>;
}
