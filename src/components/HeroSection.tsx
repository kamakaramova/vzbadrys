"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const WORDS = ["энергия", "красота", "здоровье", "сон", "сила", "баланс", "магний", "сияние", "иммунитет", "молодость", "лёгкость"];

    let animFrameId: number;
    type Particle = {
      x: number; y: number; vx: number; vy: number;
      radius: number; opacity: number;
      word: string; wordOpacity: number; wordTarget: number;
    };
    let particles: Particle[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 8000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: Math.random() * 2.5 + 1.5,
          opacity: Math.random() * 0.5 + 0.25,
          word: WORDS[Math.floor(Math.random() * WORDS.length)],
          wordOpacity: 0,
          wordTarget: 0,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mouse = mouseRef.current;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Слова появляются при приближении мыши
        p.wordTarget = dist < 90 ? 1 : 0;
        p.wordOpacity += (p.wordTarget - p.wordOpacity) * 0.08;

        if (dist < 120) {
          p.x += dx * 0.015;
          p.y += dy * 0.015;
        }

        // Рисуем молекулу: большой круг + маленький спутник
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232,132,90,${p.opacity})`;
        ctx.fill();

        // Маленький спутник-атом
        const angle = Date.now() * 0.001 + p.x;
        const sx = p.x + Math.cos(angle) * (p.radius + 4);
        const sy = p.y + Math.sin(angle) * (p.radius + 4);
        ctx.beginPath();
        ctx.arc(sx, sy, p.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(253,220,202,${p.opacity * 0.8})`;
        ctx.fill();

        // Слово — заметное, с фоном
        if (p.wordOpacity > 0.04) {
          ctx.save();
          ctx.font = `700 13px Montserrat, sans-serif`;
          ctx.textAlign = "center";
          const tw = ctx.measureText(p.word).width;
          const wx = p.x;
          const wy = p.y - p.radius - 20;
          // Фон-пилюля
          ctx.fillStyle = `rgba(255,255,255,${p.wordOpacity * 0.92})`;
          const pad = 7;
          ctx.beginPath();
          ctx.roundRect(wx - tw/2 - pad, wy - 12, tw + pad*2, 20, 10);
          ctx.fill();
          // Текст
          ctx.fillStyle = `rgba(232,132,90,${p.wordOpacity})`;
          ctx.fillText(p.word, wx, wy + 3);
          ctx.restore();
        }
      });

      // Связи между частицами
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            const alpha = (1 - dist / 110) * 0.2;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(232,132,90,${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      // Связи к мыши
      particles.forEach((p) => {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 170) {
          const alpha = (1 - dist / 170) * 0.55;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(232,132,90,${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      animFrameId = requestAnimationFrame(draw);
    };

    // Слушаем window — тогда молекулы реагируют даже под контентом
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMouseLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      // Найти ближайшую частицу и «зафиксировать» слово на 2 секунды
      let closest = particles[0];
      let minD = Infinity;
      particles.forEach((p) => {
        const d = Math.hypot(p.x - cx, p.y - cy);
        if (d < minD) { minD = d; closest = p; }
      });
      if (minD < 80) {
        closest.wordOpacity = 1;
        closest.wordTarget = 1;
        // меняем слово рандомно при клике
        closest.word = WORDS[Math.floor(Math.random() * WORDS.length)];
      }
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden bg-[#fdf8f5]">
      {/* Canvas сеть */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-auto"
        style={{ zIndex: 1 }}
      />

      {/* Градиентный оверлей */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 80% 50%, rgba(253,220,202,0.55) 0%, transparent 70%)",
          zIndex: 2,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-20 lg:py-28 w-full" style={{ zIndex: 3 }}>
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">

          {/* ЛЕВАЯ КОЛОНКА */}
          <div className="flex flex-col gap-7">
            {/* Eyebrow */}
            <div
              className="w-fit"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.8s cubic-bezier(0.32,0.72,0,1), transform 0.8s cubic-bezier(0.32,0.72,0,1)",
                transitionDelay: "0.1s",
              }}
            >
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-white/80 border border-[#FDDCCA] backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8845A] animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#E8845A]">
                  Проверенные составы · документы на каждый товар
                </span>
              </div>
            </div>

            {/* Главный заголовок */}
            <div
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(32px)",
                transition: "opacity 0.9s cubic-bezier(0.32,0.72,0,1), transform 0.9s cubic-bezier(0.32,0.72,0,1)",
                transitionDelay: "0.25s",
                position: "relative",
              }}
            >
              {/* Полупрозрачная капсула за БАД */}
              <svg
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "48%",
                  left: "clamp(2rem, 6vw, 5rem)",
                  transform: "translateY(-50%) rotate(-32deg)",
                  width: "clamp(160px, 26vw, 300px)",
                  height: "auto",
                  opacity: 0.22,
                  pointerEvents: "none",
                  zIndex: 0,
                }}
                viewBox="0 0 120 260"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="2" y="2" width="116" height="256" rx="58" fill="#E8845A"/>
              </svg>

              <h1
                className="font-black tracking-tight leading-none relative"
                style={{ fontFamily: "Montserrat, sans-serif", zIndex: 1 }}
              >
                {/* ВЗ — маленькое, сверху слева */}
                <span
                  className="block text-[#1a1a1a]"
                  style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", letterSpacing: "-0.01em" }}
                >
                  вз
                </span>
                {/* БАД — крупно */}
                <span
                  className="block"
                  style={{
                    fontSize: "clamp(5rem, 11vw, 10rem)",
                    background: "linear-gradient(135deg, #E8845A 0%, #f5a87e 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    lineHeight: 0.88,
                    marginLeft: "clamp(1.5rem, 3vw, 3rem)",
                  }}
                >
                  БАД
                </span>
                {/* рись — маленькое, снизу справа */}
                <span
                  className="block text-[#1a1a1a] text-right"
                  style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", letterSpacing: "-0.01em" }}
                >
                  рись
                </span>
              </h1>
              <p
                className="mt-4 font-bold tracking-widest text-[#E8845A] uppercase"
                style={{ fontSize: "clamp(1.1rem, 2.4vw, 1.8rem)", letterSpacing: "0.14em", position: "relative", zIndex: 1 }}
              >
                и почувствуй разницу
              </p>
            </div>

            {/* Подзаголовок */}
            <div
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(24px)",
                transition: "opacity 0.9s cubic-bezier(0.32,0.72,0,1), transform 0.9s cubic-bezier(0.32,0.72,0,1)",
                transitionDelay: "0.4s",
              }}
            >
              <p className="text-[#6b6b6b] leading-relaxed max-w-md" style={{ fontSize: "clamp(1rem, 1.4vw, 1.125rem)" }}>
                Только проверенные составы, биодоступные формы и документы на каждый товар.
              </p>
            </div>

            {/* Кнопки */}
            <div
              className="flex flex-wrap gap-3"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.9s cubic-bezier(0.32,0.72,0,1), transform 0.9s cubic-bezier(0.32,0.72,0,1)",
                transitionDelay: "0.55s",
              }}
            >
              {/* Главная CTA */}
              <Link
                href="/catalog"
                className="group relative inline-flex items-center gap-3 rounded-full px-6 py-3.5 overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #E8845A 0%, #d4703f 100%)",
                  boxShadow: "0 8px 32px rgba(232,132,90,0.4)",
                  transition: "transform 0.5s cubic-bezier(0.32,0.72,0,1), box-shadow 0.5s cubic-bezier(0.32,0.72,0,1)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 14px 40px rgba(232,132,90,0.5)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(232,132,90,0.4)";
                }}
              >
                <span className="font-bold text-white text-sm tracking-wide">Смотреть каталог</span>
                <span
                  className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center"
                  style={{ transition: "transform 0.4s cubic-bezier(0.32,0.72,0,1)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7h10M7 2l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </Link>

              {/* Вторичная */}
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-semibold text-sm text-[#1a1a1a] bg-white/70 border border-[#e8d5c4] backdrop-blur-sm"
                style={{ transition: "all 0.4s cubic-bezier(0.32,0.72,0,1)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(253,220,202,0.6)";
                  (e.currentTarget as HTMLElement).style.borderColor = "#E8845A";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.7)";
                  (e.currentTarget as HTMLElement).style.borderColor = "#e8d5c4";
                }}
              >
                Статьи о здоровье
              </Link>
            </div>

          </div>

          {/* ПРАВАЯ КОЛОНКА — место для товаров */}
          <div
            className="hidden lg:flex items-center justify-center"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0) scale(1)" : "translateY(40px) scale(0.97)",
              transition: "opacity 1s cubic-bezier(0.32,0.72,0,1), transform 1s cubic-bezier(0.32,0.72,0,1)",
              transitionDelay: "0.35s",
            }}
          >
            {/* Double-bezel контейнер */}
            <div
              className="relative w-full max-w-[460px] aspect-[4/5]"
              style={{
                background: "rgba(253,220,202,0.18)",
                border: "1px solid rgba(232,132,90,0.15)",
                borderRadius: "2.5rem",
                padding: "8px",
              }}
            >
              <div
                className="w-full h-full relative overflow-hidden"
                style={{
                  background: "linear-gradient(145deg, #fff9f6 0%, #fdf0e8 50%, #fdf8f5 100%)",
                  borderRadius: "calc(2.5rem - 8px)",
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.9)",
                }}
              >
                <img
                  src="/hero-products.png"
                  alt="Добавки взБАДрись"
                  className="absolute inset-0 h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/5" />

                {/* Флоатинг-теги */}
                <div
                  className="absolute top-5 right-5 rounded-2xl px-3 py-2 bg-white/80 border border-[#f0e8e0]"
                  style={{ backdropFilter: "blur(8px)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
                >
                  <p style={{ fontSize: "10px", color: "#aaa" }}>Сертифицировано</p>
                  <p style={{ fontSize: "12px", fontWeight: "700", color: "#1a1a1a" }}>✓ Документы</p>
                </div>

                <div
                  className="absolute top-5 left-5 rounded-2xl px-3 py-2 bg-white/80 border border-[#f0e8e0]"
                  style={{ backdropFilter: "blur(8px)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
                >
                  <p style={{ fontSize: "10px", color: "#aaa" }}>Состав</p>
                  <p style={{ fontSize: "12px", fontWeight: "700", color: "#E8845A" }}>Честный</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Скролл-хинт */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{
          zIndex: 10,
          opacity: visible ? 1 : 0,
          transition: "opacity 1s ease",
          transitionDelay: "1.2s",
          pointerEvents: "none",
        }}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E8845A]">Листай вниз</span>
        <div style={{ width: "2px", height: "36px", background: "linear-gradient(to bottom, #E8845A, transparent)" }} className="animate-bounce" />
      </div>
    </section>
  );
}
