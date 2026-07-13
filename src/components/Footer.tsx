import Link from "next/link";
import PaymentLogos from "@/components/PaymentLogos";

export default function Footer() {
  return (
    <footer className="bg-[#fdf8f5] border-t border-[#f0e8e0] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Бренд */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-full bg-[#E8845A] flex items-center justify-center">
                <span className="text-white font-bold text-sm">В</span>
              </div>
              <span className="font-bold text-xl">Взбадрись</span>
            </div>
            <p className="text-sm text-[#6b6b6b] leading-relaxed">
              БАДы и суперфуды с документами. Только проверенные составы и честная информация.
            </p>
          </div>

          {/* Каталог */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Каталог</h4>
            <ul className="flex flex-col gap-2.5">
              <li><Link href="/catalog?cat=bads" className="text-sm text-[#6b6b6b] hover:text-[#E8845A] transition-colors">БАДы</Link></li>
              <li><Link href="/catalog?cat=seeds" className="text-sm text-[#6b6b6b] hover:text-[#E8845A] transition-colors">Семена</Link></li>
              <li><Link href="/catalog?badge=new" className="text-sm text-[#6b6b6b] hover:text-[#E8845A] transition-colors">Новинки</Link></li>
              <li><Link href="/catalog?badge=sale" className="text-sm text-[#6b6b6b] hover:text-[#E8845A] transition-colors">Акции</Link></li>
            </ul>
          </div>

          {/* Покупателям */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Покупателям</h4>
            <ul className="flex flex-col gap-2.5">
              <li><Link href="/delivery" className="text-sm text-[#6b6b6b] hover:text-[#E8845A] transition-colors">Доставка и оплата</Link></li>
              <li><Link href="/returns" className="text-sm text-[#6b6b6b] hover:text-[#E8845A] transition-colors">Возврат</Link></li>
              <li><Link href="/contacts" className="text-sm text-[#6b6b6b] hover:text-[#E8845A] transition-colors">Контакты</Link></li>
              <li><Link href="/account" className="text-sm text-[#6b6b6b] hover:text-[#E8845A] transition-colors">Личный кабинет</Link></li>
              <li><Link href="/blog" className="text-sm text-[#6b6b6b] hover:text-[#E8845A] transition-colors">Статьи о здоровье</Link></li>
            </ul>
          </div>

          {/* Контакты */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Контакты</h4>
            <ul className="flex flex-col gap-2.5">
              <li className="text-sm text-[#6b6b6b]">Telegram: <a href="https://t.me/vzbadris" className="hover:text-[#E8845A] transition-colors">@vzbadris</a></li>
              <li className="text-sm text-[#6b6b6b]">Instagram*: <a href="https://instagram.com/vzbadris" className="hover:text-[#E8845A] transition-colors">@vzbadris</a></li>
              <li className="text-sm text-[#6b6b6b]">Почта: <a href="mailto:vzbadris@yandex.ru" className="hover:text-[#E8845A] transition-colors">vzbadris@yandex.ru</a></li>
            </ul>
            <div className="mt-6">
              <p className="text-xs text-[#aaa]">Не является лекарственным средством. Перед применением проконсультируйтесь со специалистом.</p>
            </div>
          </div>
        </div>

        {/* Способы оплаты */}
        <div className="border-t border-[#f0e8e0] mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#aaa]">Безопасная оплата картой или через СБП</p>
          <PaymentLogos />
        </div>

        {/* Правовые ссылки */}
        <div className="border-t border-[#f0e8e0] mt-6 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#aaa]">© 2026 Взбадрись · ИП Абдулкина П. В. · ИНН 166107199180</p>
          <div className="flex flex-wrap gap-4 justify-center sm:justify-end">
            <Link href="/oferta" target="_blank" className="text-xs text-[#aaa] hover:text-[#E8845A] transition-colors">Публичная оферта</Link>
            <Link href="/privacy" target="_blank" className="text-xs text-[#aaa] hover:text-[#E8845A] transition-colors">Политика конфиденциальности</Link>
            <Link href="/soglasie" target="_blank" className="text-xs text-[#aaa] hover:text-[#E8845A] transition-colors">Согласие на обработку данных</Link>
            <Link href="/cookie" className="text-xs text-[#aaa] hover:text-[#E8845A] transition-colors">Cookie</Link>
          </div>
        </div>

        {/* Дисклеймер Instagram / Meta */}
        <p className="text-[10px] text-[#c8beb4] mt-4 leading-relaxed">
          *Instagram принадлежит компании Meta Platforms Inc., признанной в Российской Федерации экстремистской организацией, её деятельность на территории РФ запрещена.
        </p>
      </div>
    </footer>
  );
}
