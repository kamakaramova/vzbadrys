// Админка зависит от текущей авторизованной сессии и должна всегда получать
// актуальный HTML с корректными хэшами клиентских скриптов. Иначе браузер может
// совместить старую страницу с новым JavaScript, из-за чего перестают работать
// интерактивные поля — в том числе поиск.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
