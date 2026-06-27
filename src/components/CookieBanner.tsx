"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("vzbadrys-cookie-consent");
    if (!accepted) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("vzbadrys-cookie-consent", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-[#f0e8e0] shadow-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-[#6b6b6b] leading-relaxed">
          🍪 Мы используем файлы cookie, чтобы сайт работал корректно и был удобнее.
          Продолжая пользоваться сайтом, вы соглашаетесь с{" "}
          <Link href="/cookie" className="text-[#E8845A] underline hover:text-[#d4703f]">политикой использования cookie</Link>{" "}
          и{" "}
          <a href="/privacy" target="_blank" className="text-[#E8845A] underline hover:text-[#d4703f]">политикой конфиденциальности</a>.
        </div>
        <button
          onClick={accept}
          className="w-full sm:w-auto flex-shrink-0 bg-[#E8845A] hover:bg-[#d4703f] text-white font-semibold text-sm px-6 py-3 rounded-full transition-all whitespace-nowrap"
        >
          Принять
        </button>
      </div>
    </div>
  );
}
