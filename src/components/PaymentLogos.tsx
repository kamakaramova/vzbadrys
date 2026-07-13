// Логотипы платёжных систем (векторные, официальные цвета)
export default function PaymentLogos() {
  const badge = "bg-white border border-[#f0e8e0] rounded-lg px-3 h-9 flex items-center justify-center";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Visa */}
      <div className={badge} aria-label="Visa">
        <svg height="14" viewBox="0 0 48 16" xmlns="http://www.w3.org/2000/svg">
          <text x="0" y="13" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="700" fontStyle="italic" fill="#1434CB">VISA</text>
        </svg>
      </div>

      {/* Mastercard */}
      <div className={badge} aria-label="Mastercard">
        <svg height="22" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="12" r="11" fill="#EB001B" />
          <circle cx="24" cy="12" r="11" fill="#F79E1B" />
          <path d="M19 3.6a11 11 0 0 1 0 16.8 11 11 0 0 1 0-16.8Z" fill="#FF5F00" />
        </svg>
      </div>

      {/* Мир */}
      <div className={badge} aria-label="Мир">
        <svg height="13" viewBox="0 0 44 14" xmlns="http://www.w3.org/2000/svg">
          <text x="0" y="12" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="800" fill="#0F754E">мир</text>
        </svg>
      </div>

      {/* СБП */}
      <div className={badge} aria-label="СБП — Система быстрых платежей">
        <svg height="18" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="4" height="8" rx="1" fill="#1F8B4C" transform="rotate(-30 3 5)" />
          <rect x="9" y="1" width="4" height="8" rx="1" fill="#F9A01B" transform="rotate(-30 11 5)" />
          <rect x="9" y="12" width="4" height="8" rx="1" fill="#EB1C24" transform="rotate(30 11 16)" />
          <rect x="1" y="12" width="4" height="8" rx="1" fill="#1D9BD7" transform="rotate(30 3 16)" />
        </svg>
        <span className="ml-1.5 text-xs font-bold text-[#1a1a1a]">СБП</span>
      </div>

      {/* Ozon Pay */}
      <div className={badge} aria-label="Ozon Pay">
        <span className="text-xs font-black text-[#005BFF] tracking-tight">OZON<span className="text-[#1a1a1a]"> Pay</span></span>
      </div>
    </div>
  );
}
