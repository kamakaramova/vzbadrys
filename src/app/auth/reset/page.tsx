"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Eye, EyeOff, Lock } from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const save = async () => {
    if (password.length < 8) {
      setError("Пароль должен содержать минимум 8 символов");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    if (!supabase) {
      setError("Восстановление пароля пока не настроено");
      return;
    }
    setLoading(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError("Ссылка недействительна или устарела. Запросите новую ссылку.");
      return;
    }
    setDone(true);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#fdfcfb] flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#f0e8e0] p-7 shadow-sm">
          {done ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto">
                <Check size={26} />
              </div>
              <h1 className="text-2xl font-bold mt-5">Пароль обновлён</h1>
              <p className="text-sm text-[#6b6b6b] mt-2">Теперь Вы можете войти в личный кабинет с новым паролем.</p>
              <Link href="/auth" className="block mt-6 bg-[#E8845A] text-white font-bold py-3.5 rounded-2xl">
                Войти в кабинет
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Новый пароль</h1>
              <p className="text-sm text-[#6b6b6b] mt-2 mb-6">Придумайте новый пароль для входа во «взБАДрись».</p>
              {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600">{error}</div>}
              <div className="space-y-4">
                <PasswordInput label="Новый пароль" value={password} onChange={setPassword} show={show} onToggle={() => setShow(!show)} />
                <PasswordInput label="Повторите пароль" value={confirm} onChange={setConfirm} show={show} onToggle={() => setShow(!show)} />
                <button
                  type="button"
                  onClick={save}
                  disabled={loading}
                  className="w-full bg-[#E8845A] text-white font-bold py-3.5 rounded-2xl disabled:opacity-60"
                >
                  {loading ? "Сохраняем..." : "Сохранить новый пароль"}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#6b6b6b] mb-1.5 uppercase">{label}</label>
      <div className="relative">
        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aaa]" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full pl-10 pr-10 py-3 border border-[#f0e8e0] rounded-2xl text-sm outline-none focus:border-[#E8845A]"
        />
        <button type="button" onClick={onToggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#aaa]">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
