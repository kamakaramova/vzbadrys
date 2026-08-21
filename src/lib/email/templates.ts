export type OrderEmailStatus =
  | "paid"
  | "payment_failed"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface EmailOrder {
  id: string;
  customerName: string;
  total: number;
  items: { name: string; quantity: number; price: number }[];
  deliveryMethodCode?: string;
  deliveryMethod?: string;
  deliveryAddress?: string;
  trackNumber?: string;
  bonusBalance?: number;
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
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #f0e2da;border-radius:22px;overflow:hidden">
          <tr><td style="background:#fddcca;padding:24px 28px;text-align:center">
            <div style="font-size:24px;font-weight:800;color:#2d2926">вз<span style="color:#e8845a">БАД</span>рись</div>
            <div style="font-size:12px;line-height:1.5;margin-top:5px;color:#8a5d47">Добавки с документами и заботой о Вас</div>
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

  return `<div style="border:1px solid #f0e2da;border-radius:16px;padding:18px;margin:0 0 20px;background:#fffdfb">
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
  const accountUrl = "https://xn--80abckmj9cj3h.xn--p1ai/account";
  const cartUrl = "https://xn--80abckmj9cj3h.xn--p1ai/cart";
  const deliveryCode = order.deliveryMethodCode || "";
  const trackBlock = order.trackNumber
    ? `<div style="background:#fff3ec;border-radius:14px;padding:16px;margin-bottom:20px">
        <p style="margin:0 0 5px;font-size:13px;color:#806f65">Трек-номер</p>
        <p style="margin:0;font-size:19px;font-weight:800;color:#e8845a">${escapeHtml(order.trackNumber)}</p>
      </div>`
    : "";
  const deliveryBlock = order.deliveryAddress
    ? `<div style="background:#fdf8f5;border-radius:14px;padding:16px;margin-bottom:20px">
        <p style="margin:0 0 5px;font-size:13px;color:#806f65">${deliveryCode === "pickup" ? "Адрес самовывоза" : "Доставка"}</p>
        <p style="margin:0;font-size:15px;line-height:1.55;color:#2d2926"><b>${escapeHtml(order.deliveryMethod || "")}</b><br>${escapeHtml(order.deliveryAddress)}</p>
      </div>`
    : "";
  const shippedContent = (() => {
    if (deliveryCode === "ozon_pvz") {
      return {
        subject: `Ваш заказ ${order.id} передан в доставку Ozon`,
        title: "Заказ отправился к Вам",
        lead: `${name}, мы передали Ваш заказ в доставку Ozon. После оформления посылка появится в личном кабинете Ozon. Там Вы сможете следить за её движением и увидеть, когда она поступит в выбранный ПВЗ.`,
        extra: `${deliveryBlock}<div style="background:#fff3ec;border-radius:14px;padding:16px;margin-bottom:20px"><p style="margin:0;font-size:14px;line-height:1.6;color:#5f5752"><b>Обратите внимание:</b> номер телефона в заказе должен совпадать с номером, который привязан к Вашему аккаунту Ozon.</p></div>${trackBlock}${actionButton("Открыть личный кабинет Ozon", "https://www.ozon.ru/my/orderlist/")}`,
      };
    }
    if (deliveryCode === "pochta") {
      const trackingUrl = order.trackNumber
        ? `https://www.pochta.ru/tracking?barcode=${encodeURIComponent(order.trackNumber)}`
        : "https://www.pochta.ru/tracking";
      return {
        subject: `Ваш заказ ${order.id} передан Почте России`,
        title: "Заказ уже в пути",
        lead: `${name}, мы передали Ваш заказ Почте России. Следить за посылкой можно по трек-номеру. Когда она поступит в отделение, статус обновится на сайте или в приложении Почты России.`,
        extra: `${deliveryBlock}${trackBlock}${actionButton("Отследить посылку", trackingUrl)}`,
      };
    }
    if (deliveryCode === "pickup") {
      return {
        subject: `Ваш заказ ${order.id} готов к самовывозу`,
        title: "Ваш заказ уже ждёт Вас",
        lead: `${name}, хорошие новости: мы собрали и подготовили Ваш заказ.`,
        extra: `<div style="background:#fff3ec;border-radius:14px;padding:18px;margin-bottom:20px"><p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#2d2926"><b>Адрес:</b> г. Казань, ул. Айдарова, 15</p><p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#2d2926"><b>Самовывоз:</b> по средам, с 10:00 до 20:00 по московскому времени</p><p style="margin:0;font-size:15px;line-height:1.6;color:#2d2926"><b>Телефон:</b> <a href="tel:+79872970767" style="color:#e8845a;text-decoration:none">+7 987 297 07 67</a></p></div><p style="font-size:15px;line-height:1.65;margin:0 0 18px;color:#5f5752">Пожалуйста, не менее чем за час до приезда позвоните нам и согласуйте время получения. Так мы точно будем ждать Вас и передадим заказ без задержек.</p>${actionButton("Позвонить и договориться", "tel:+79872970767")}`,
      };
    }
    return {
      subject: `Заказ ${order.id} отправился к Вам`,
      title: "Заказ уже в пути",
      lead: `${name}, Ваш заказ передан в доставку. Как только он прибудет в пункт выдачи, служба доставки сообщит Вам.`,
      extra: `${deliveryBlock}${trackBlock}`,
    };
  })();
  const hasBonusBalance = typeof order.bonusBalance === "number" && Number.isFinite(order.bonusBalance);
  const bonusBalance = hasBonusBalance ? Math.max(0, Math.floor(order.bonusBalance || 0)) : 0;
  const bonusSummary = hasBonusBalance
    ? `<div style="background:#fff3ec;border-radius:16px;padding:18px;margin-bottom:20px;text-align:center"><p style="margin:0 0 6px;font-size:14px;color:#806f65">Сейчас на Вашем бонусном счёте</p><p style="margin:0;font-size:28px;font-weight:800;color:#e8845a">${bonusBalance.toLocaleString("ru-RU")} бонусов</p><p style="margin:8px 0 0;font-size:13px;line-height:1.55;color:#806f65">1 бонус = 1 ₽. Бонусами можно оплатить до 30% стоимости товаров в следующем заказе.</p></div>`
    : `<div style="background:#fff3ec;border-radius:16px;padding:18px;margin-bottom:20px"><p style="margin:0;font-size:14px;line-height:1.6;color:#5f5752">Бонусы за покупку уже доступны в личном кабинете. Ими можно оплатить до 30% стоимости товаров в следующем заказе.</p></div>`;
  const statusContent: Record<OrderEmailStatus, { subject: string; title: string; lead: string; extra?: string }> = {
    paid: {
      subject: `Оплата заказа ${order.id} прошла`,
      title: "Спасибо, оплата прошла",
      lead: `${name}, спасибо за заказ во «взБАДрись»! Он уже передан на сборку. Мы проверим товары и аккуратно их упакуем. Когда заказ будет готов к выдаче или отправится в доставку, Вам придёт отдельное письмо.`,
      extra: actionButton("Посмотреть заказ", accountUrl),
    },
    payment_failed: {
      subject: `Заказ ${order.id} отменён`,
      title: "Заказ не удалось завершить",
      lead: `${name}, к сожалению, оформить заказ до конца не получилось, поэтому он был отменён.`,
      extra: `<div style="background:#fff3ec;border-radius:16px;padding:18px;margin-bottom:20px"><p style="margin:0;font-size:15px;line-height:1.65;color:#5f5752">Иногда причина бывает временной: ошибка платёжного сервиса, банка или оформления. Пожалуйста, проверьте данные и попробуйте собрать заказ ещё раз.</p></div>${actionButton("Вернуться в корзину", cartUrl)}<p style="font-size:14px;line-height:1.6;margin:0;color:#806f65">Если с карты уже списались деньги или Вы не понимаете причину отмены, просто ответьте на это письмо — мы всё проверим и поможем.</p>`,
    },
    confirmed: {
      subject: `Мы уже собираем Ваш заказ ${order.id}`,
      title: "Ваш заказ уже у нас в работе",
      lead: `${name}, проверяем товары и готовим их к отправке. Как только заказ передадут в доставку или подготовят к самовывозу, мы сразу сообщим.`,
    },
    shipped: shippedContent,
    delivered: {
      subject: "Спасибо, что выбрали «взБАДрись»!",
      title: "Спасибо, что выбрали нас",
      lead: `${name}, Ваш заказ получен. Надеемся, всё добралось благополучно и покупки Вас порадовали. Нам очень приятно быть частью Вашей заботы о себе.`,
      extra: `${bonusSummary}<div style="border:1px solid #f0e2da;border-radius:16px;padding:18px;margin-bottom:20px"><p style="margin:0 0 8px;font-size:17px;font-weight:800;color:#2d2926">Как увеличить количество бонусов?</p><p style="margin:0;font-size:15px;line-height:1.65;color:#5f5752">В личном кабинете можно оставить отзыв о купленных добавках. За каждый опубликованный отзыв мы начислим ещё 20 бонусов. Ваш опыт поможет другим покупателям определиться с выбором.</p></div>${actionButton("Оставить отзыв", accountUrl)}<p style="font-size:15px;line-height:1.65;margin:0;color:#5f5752">Спасибо, что выбираете нас. Будем рады видеть Вас снова!</p>`,
    },
    cancelled: {
      subject: `Заказ ${order.id} отменён`,
      title: "Заказ не удалось завершить",
      lead: `${name}, к сожалению, оформить заказ до конца не получилось, поэтому он был отменён.`,
      extra: `<div style="background:#fff3ec;border-radius:16px;padding:18px;margin-bottom:20px"><p style="margin:0;font-size:15px;line-height:1.65;color:#5f5752">Иногда причина бывает временной: ошибка платёжного сервиса, банка или оформления. Пожалуйста, проверьте данные и попробуйте собрать заказ ещё раз.</p></div>${actionButton("Вернуться в корзину", cartUrl)}<p style="font-size:14px;line-height:1.6;margin:0;color:#806f65">Если с карты уже списались деньги или Вы не понимаете причину отмены, просто ответьте на это письмо — мы всё проверим и поможем.</p>`,
    },
  };
  const content = statusContent[status];
  const delivery = status === "shipped" ? "" : deliveryBlock;
  const body = status === "delivered"
    ? content.extra || ""
    : `${orderCard(order)}${delivery}${content.extra || ""}`;

  return {
    subject: content.subject,
    html: layout(
      content.title,
      content.lead,
      `${body}<span style="display:none">${escapedName}</span>`
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
