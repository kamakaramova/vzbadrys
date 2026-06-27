"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuthStore } from "@/store/authStore";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Check, User, Mail, Phone, Lock } from "lucide-react";

type Mode = "login" | "register";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/account";

  const { login, register } = useAuthStore();

  const [mode, setMode] = useState<Mode>("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    emailOrPhone: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
  });

  const set = (field: string, val: string) => {
    setForm((f) => ({ ...f, [field]: val }));
    setError("");
  };

  const handleLogin = async () => {
    if (!form.emailOrPhone.trim() || !form.password) {
      setError("Заполните все поля");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    const res = login(form.emailOrPhone, form.password);
    setLoading(false);
    if (!res.ok) { setError(res.error || "Ошибка входа"); return; }
    router.push(redirect);
  };

  const handleRegister = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
      setError("Заполните все обязательные поля");
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const res = register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
    setLoading(false);
    if (!res.ok) { setError(res.error || "Ошибка регистрации"); return; }
    setSuccess("Добро пожаловать! Перенаправляем...");
    setTimeout(() => router.push(redirect), 1000);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#fdfcfb] flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md">
          {/* Логотип */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#E8845A] flex items-center justify-center">
                <span className="text-white font-bold">В</span>
              </div>
              <span className="font-black text-xl" style={{ fontFamily: "Montserrat, sans-serif" }}>
                вз<span style={{ background: "linear-gradient(135deg, #E8845A, #f5a87e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>БАД</span>рись
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-[#1a1a1a]">
              {mode === "login" ? "Войти в аккаунт" : "Создать аккаунт"}
            </h1>
            <p className="text-sm text-[#6b6b6b] mt-1">
              {mode === "login" ? "Ещё нет аккаунта?" : "Уже есть аккаунт?"}{" "}
              <button
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setForm({ name: "", emailOrPhone: "", email: "", phone: "", password: "", passwordConfirm: "" }); }}
                className="font-semibold text-[#E8845A] hover:underline"
              >
                {mode === "login" ? "Зарегистрироваться" : "Войти"}
              </button>
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-[#f0e8e0] p-7 shadow-sm">
            {/* Переключатель вход/регистрация */}
            <div className="flex bg-[#fdf8f5] rounded-2xl p-1 mb-6">
              {(["login", "register"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(""); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${mode === m ? "bg-white shadow text-[#E8845A]" : "text-[#6b6b6b] hover:text-[#1a1a1a]"}`}
                >
                  {m === "login" ? "Войти" : "Регистрация"}
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                <Check size={16} /> {success}
              </div>
            )}

            {mode === "login" ? (
              <div className="space-y-4">
                <InputField
                  label="Email или телефон"
                  icon={<Mail size={16} />}
                  type="text"
                  value={form.emailOrPhone}
                  onChange={(v) => set("emailOrPhone", v)}
                  placeholder="email@mail.ru или +7 999 000 00 00"
                />
                <InputField
                  label="Пароль"
                  icon={<Lock size={16} />}
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(v) => set("password", v)}
                  placeholder="Ваш пароль"
                  suffix={
                    <button type="button" onClick={() => setShowPass(!showPass)} className="text-[#aaa] hover:text-[#1a1a1a]">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full bg-[#E8845A] hover:bg-[#d4703f] disabled:bg-[#f5c9b0] text-white font-bold py-3.5 rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-md mt-2"
                >
                  {loading ? "Входим..." : "Войти"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <InputField
                  label="Имя"
                  icon={<User size={16} />}
                  type="text"
                  value={form.name}
                  onChange={(v) => set("name", v)}
                  placeholder="Как вас зовут?"
                />
                <InputField
                  label="Email"
                  icon={<Mail size={16} />}
                  type="email"
                  value={form.email}
                  onChange={(v) => set("email", v)}
                  placeholder="email@mail.ru"
                />
                <InputField
                  label="Телефон"
                  icon={<Phone size={16} />}
                  type="tel"
                  value={form.phone}
                  onChange={(v) => set("phone", v)}
                  placeholder="+7 (999) 000-00-00"
                />
                <InputField
                  label="Пароль"
                  icon={<Lock size={16} />}
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(v) => set("password", v)}
                  placeholder="Минимум 6 символов"
                  suffix={
                    <button type="button" onClick={() => setShowPass(!showPass)} className="text-[#aaa] hover:text-[#1a1a1a]">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
                <InputField
                  label="Повторите пароль"
                  icon={<Lock size={16} />}
                  type={showPass ? "text" : "password"}
                  value={form.passwordConfirm}
                  onChange={(v) => set("passwordConfirm", v)}
                  placeholder="Ещё раз пароль"
                />

                {/* Бонусы при регистрации */}
                <div className="bg-[#fff8f5] border border-[#f5d5c0] rounded-2xl p-4 text-sm">
                  <p className="font-semibold text-[#E8845A] mb-1">🎁 При регистрации:</p>
                  <ul className="space-y-1 text-[#6b6b6b]">
                    <li className="flex items-center gap-2"><Check size={12} className="text-[#E8845A]" /> Личный реферальный код</li>
                    <li className="flex items-center gap-2"><Check size={12} className="text-[#E8845A]" /> Бонусы 1% с каждого заказа</li>
                    <li className="flex items-center gap-2"><Check size={12} className="text-[#E8845A]" /> История всех заказов</li>
                  </ul>
                </div>

                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="w-full bg-[#E8845A] hover:bg-[#d4703f] disabled:bg-[#f5c9b0] text-white font-bold py-3.5 rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
                </button>
              </div>
            )}

            <p className="text-xs text-center text-[#aaa] mt-5">
              Регистрируясь, вы соглашаетесь с{" "}
              <Link href="/privacy" className="underline hover:text-[#E8845A]">политикой конфиденциальности</Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthContent />
    </Suspense>
  );
}

function InputField({
  label, icon, type, value, onChange, placeholder, suffix,
}: {
  label: string;
  icon: React.ReactNode;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#6b6b6b] mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aaa]">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 border border-[#f0e8e0] rounded-2xl text-sm outline-none focus:border-[#E8845A] transition-colors bg-[#fdfcfb]"
        />
        {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2">{suffix}</span>}
      </div>
    </div>
  );
}
