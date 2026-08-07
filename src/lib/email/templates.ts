export type OrderEmailStatus =
  | "paid"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface EmailOrder {
  id: string;
  customerName: string;
  total: number;
  items: { name: string; quantity: number; price: number }[];
  deliveryMethod?: string;
  deliveryAddress?: string;
  trackNumber?: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value: number) {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function layout(title: string, lead: string, body: string) {
  return `<!doctype html>
<html lang="ru">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
  <body style="margin:0;background:#f7f3f0;font-family:Arial,sans-serif;color:#2d2926">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3f0;padding:24px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #f0e2da">
          <tr><td style="background:#fddcca;padding:22px 28px;text-align:center">
            <div style="font-size:24px;font-weight:800;color:#2d2926">вз<span style="color:#e8845a">БАД</span>рись</div>
          </td></tr>
          <tr><td style="padding:32px 28px">
            <h1 style="font-size:25px;line-height:1.25;margin:0 0 14px">${escapeHtml(title)}</h1>
            <p style="font-size:16px;line-height:1.6;margin:0 0 24px;color:#5f5752">${escapeHtml(lead)}</p>
            ${body}
          </td></tr>
          <tr><td style="padding:22px 28px;background:#fff8f4;border-top:1px solid #f0e2da">
            <p style="font-size:13px;line-height:1.5;margin:0;color:#806f65">
              Есть вопрос? Ответьте на это письмо или напишите нам:
              <a href="mailto:vzbadris@yandex.ru" style="color:#e8845a">vzbadris@yandex.ru</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function orderCard(order: EmailOrder) {
  const items = order.items
    .map(
      (item) => `<tr>
        <td style="padding:9px 0;border-bottom:1px solid #f3ebe6;font-size:14px">
          ${escapeHtml(item.name)} × ${item.quantity}
        </td>
        <td align="right" style="padding:9px 0;border-bottom:1px solid #f3ebe6;font-size:14px;font-weight:700">
          ${money(item.price * item.quantity)}
        </td>
      </tr>`
    )
    .join("");

  return `<div style="border:1px solid #f0e2da;padding:18px;margin:0 0 20px">
    <p style="margin:0 0 12px;font-size:13px;color:#8a7b72">Заказ ${escapeHtml(order.id)}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${items}</table>
    <p style="margin:16px 0 0;text-align:right;font-size:18px;font-weight:800;color:#e8845a">
      Итого: ${money(order.total)}
    </p>
  </div>`;
}

export function orderEmail(
  status: OrderEmailStatus,
  order: EmailOrder
): { subject: string; html: string } {
  const name = order.customerName || "Здравствуйте";
  const escapedName = escapeHtml(name);
  const statusContent: Record<OrderEmailStatus, { subject: string; title: string; lead: string; extra?: string }> = {
    paid: {
      subject: `Оплата прошла — начинаем собирать заказ ${order.id}`,
      title: "Всё получилось!",
      lead: `${name}, спасибо за заказ во «взБАДрись»! Оплата прошла, и Ваш заказ уже ждёт сборки. Мы внимательно всё проверим и бережно упакуем. Когда заказ отправится к Вам, пришлём отдельное письмо.`,
    },
    confirmed: {
      subject: `Ваш заказ ${order.id} уже собираем`,
      title: "Собираем полезное для Вас",
      lead: `${name}, Ваш заказ уже у нас в работе. Проверяем товары и готовим посылку к отправке. Как только передадим её в службу доставки, сразу сообщим.`,
    },
    shipped: {
      subject: `Заказ ${order.id} отправился к Вам`,
      title: "Уже в пути!",
      lead: `${name}, Ваш заказ передан в доставку. Теперь осталось совсем немного подождать.`,
      extra: order.trackNumber
        ? `<div style="background:#fff3ec;padding:16px;margin-bottom:20px">
            <p style="margin:0 0 5px;font-size:13px;color:#806f65">Трек-номер</p>
            <p style="margin:0;font-size:19px;font-weight:800;color:#e8845a">${escapeHtml(order.trackNumber)}</p>
          </div>`
        : undefined,
    },
    delivered: {
      subject: `Ваш заказ ${order.id} доставлен`,
      title: "Посылка уже ждёт Вас",
      lead: `${name}, заказ доставлен. Надеемся, знакомство со «взБАДрись» станет началом приятной и полезной привычки. Спасибо, что выбрали нас!`,
    },
    cancelled: {
      subject: `Заказ ${order.id} отменён`,
      title: "Заказ не удалось завершить",
      lead: `${name}, заказ отменён. Если это произошло по ошибке или Вы захотите повторить заказ, ответьте на письмо — мы поможем.`,
    },
  };
  const content = statusContent[status];
  const delivery = order.deliveryAddress
    ? `<p style="font-size:14px;line-height:1.5;color:#5f5752"><b>Доставка:</b> ${escapeHtml(order.deliveryMethod || "")}<br>${escapeHtml(order.deliveryAddress)}</p>`
    : "";

  return {
    subject: content.subject,
    html: layout(
      content.title,
      content.lead,
      `${content.extra || ""}${orderCard(order)}${delivery}<span style="display:none">${escapedName}</span>`
    ),
  };
}

export function testEmail(recipient: string) {
  return {
    subject: "Письма «взБАДрись» подключены",
    html: layout(
      "Всё работает!",
      "Это тестовое письмо от интернет-магазина «взБАДрись». Значит, мы сможем вовремя сообщать покупателям об оплате, сборке и доставке заказов.",
      `<div style="background:#fff3ec;padding:18px">
        <p style="margin:0;font-size:14px;line-height:1.6">Получатель: ${escapeHtml(recipient)}</p>
        <p style="margin:6px 0 0;font-size:14px;line-height:1.6">Resend работает, домен подтверждён, шаблон отображается корректно.</p>
      </div>`
    ),
  };
}

export function manualEmail(subject: string, message: string) {
  const paragraphs = message
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="font-size:16px;line-height:1.65;margin:0 0 16px;color:#5f5752">${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");

  return {
    subject: subject.trim(),
    html: layout(subject.trim(), "Сообщение от команды «взБАДрись»", paragraphs),
  };
}

function actionButton(label: string, url: string) {
  return `<p style="margin:26px 0">
    <a href="${escapeHtml(url)}" style="display:inline-block;background:#e8845a;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:8px">
      ${escapeHtml(label)}
    </a>
  </p>`;
}

export function confirmationEmail(email: string, actionUrl: string) {
  return {
    subject: "Подтвердите регистрацию во «взБАДрись»",
    html: layout(
      "Добро пожаловать!",
      "Вы создали аккаунт во «взБАДрись». Остался один небольшой шаг: подтвердите Ваш email.",
      `<div style="background:#fff3ec;padding:18px;margin-bottom:20px">
        <p style="margin:0;font-size:14px;line-height:1.6">Ваш логин: <b>${escapeHtml(email)}</b></p>
        <p style="margin:6px 0 0;font-size:13px;line-height:1.6;color:#806f65">Пароль хранится в защищённом виде и в письмах не отправляется.</p>
      </div>
      ${actionButton("Подтвердить почту", actionUrl)}
      <p style="font-size:14px;line-height:1.6;color:#5f5752">
        После подтверждения Вы сможете войти в личный кабинет, посмотреть историю заказов и сохранить любимые товары.
      </p>`
    ),
  };
}

export function recoveryEmail(email: string, actionUrl: string) {
  return {
    subject: "Восстановление пароля «взБАДрись»",
    html: layout(
      "Создадим новый пароль",
      `Мы получили запрос на восстановление пароля для аккаунта ${email}.`,
      `${actionButton("Задать новый пароль", actionUrl)}
      <p style="font-size:14px;line-height:1.6;color:#806f65">
        Ссылка одноразовая и действует ограниченное время. Если Вы не запрашивали восстановление, просто проигнорируйте это письмо: Ваш пароль не изменится.
      </p>`
    ),
  };
}
