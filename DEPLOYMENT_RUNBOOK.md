# Развёртывание «взБАДрись»

Этот файл хранит техническую схему production-развёртывания. Пароли, ключи и
значения переменных окружения сюда **никогда не добавлять**.

## Текущая схема (10 августа 2026)

```text
GitHub (kamakaramova/vzbadrys, ветка main)
       │
       ├── Vercel — прежний production, работает до переключения DNS
       │
       └── VPS REG.Облако, Москва-3 — новая production-копия
                ├── Caddy (HTTPS и обратный прокси)
                ├── Ozon Delivery Gateway: api.взбадрись.рф → 127.0.0.1:3001
                └── Магазин Next.js: 127.0.0.1:3000

Supabase, Ozon Acquiring, Resend и GitHub не переносятся: новый VPS использует
те же внешние сервисы и те же production-переменные окружения.
```

## VPS

- Провайдер: REG.Облако / REG.RU.
- Регион: Москва-3.
- ОС: Ubuntu 26.04 LTS.
- Внешний IP: `161.104.19.48`.
- Тариф после увеличения: `HP C2-M2-D40` (2 vCPU, 2 ГБ RAM, 40 ГБ NVMe).
- Репозиторий на сервере: `/opt/vzbadrys`.
- Production-переменные: `/etc/vzbadrys/vzbadrys.env`, права `600`.
- Сервис магазина: `vzbadrys.service`.
- Магазин слушает только `127.0.0.1:3000`.
- Ozon Gateway остаётся отдельным сервисом и слушает `127.0.0.1:3001`.

## Защита production

- UFW пропускает снаружи только `22`, `80` и `443`; приложение и Ozon Gateway
  доступны только через Caddy.
- Fail2ban защищает SSH, автоматические обновления безопасности Ubuntu включены.
- Вход SSH по паролю отключён; root допускается только по ключу.
- Процесс `vzbadrys` ограничен systemd-профилем из
  `scripts/security/vzbadrys-hardening.conf`: без новых привилегий, системные
  каталоги только для чтения, без доступа к домашним каталогам и устройствам.
- Админка использует подписанную `HttpOnly`-сессию; пароль администратора не
  сохраняется в браузере и не передаётся с каждым запросом.
- На чувствительных публичных API действуют ограничения частоты запросов,
  изображения проверяются по размеру, типу и сигнатуре файла.
- Next.js отдаёт CSP, HSTS, запрет встраивания сайта во фрейм и другие защитные
  HTTP-заголовки. Production-зависимости проверяются командой
  `npm audit --omit=dev`.

Перед изменениями кода можно создать копию без секретов:

```bash
install -d -m 700 /opt/vzbadrys-backups
tar -C /opt -czf /opt/vzbadrys-backups/pre-deploy-$(date +%Y%m%d-%H%M%S).tar.gz \
  --exclude=vzbadrys/node_modules --exclude=vzbadrys/.next \
  --exclude=vzbadrys/.git --exclude=vzbadrys/.env.local vzbadrys
chmod 600 /opt/vzbadrys-backups/*.tar.gz
```

Эта копия сохраняет код и загруженные статические материалы, но не заменяет
резервное копирование Supabase. Резервные копии базы следует включать и
проверять отдельно в панели Supabase.

## Уже выполнено

1. На VPS развёрнут код ветки `main` из `https://github.com/kamakaramova/vzbadrys.git`.
2. Установлены зависимости и успешно выполнена production-сборка Next.js.
3. Запущен и включён после перезагрузки systemd-сервис `vzbadrys`.
4. Проверки на сервере прошли:
   - `http://127.0.0.1:3000/` отвечает `200`;
   - `https://api.xn--80abckmj9cj3h.xn--p1ai/gateway-health` отвечает `200`.
5. Vercel и DNS старого домена пока не переключались.

## Переменные окружения

Значения взяты из production-окружения Vercel и хранятся только в
`/etc/vzbadrys/vzbadrys.env`. Для работы приложения требуются следующие имена:

```text
ADMIN_PASSWORD
EMAIL_FROM
EMAIL_REPLY_TO
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
OZON_ACQUIRING_ACCESS_KEY
OZON_ACQUIRING_FISCALIZATION_TYPE
OZON_ACQUIRING_NOTIFICATION_SECRET
OZON_ACQUIRING_SECRET_KEY
OZON_ACQUIRING_VAT
OZON_DELIVERY_GATEWAY_SHARED_SECRET
OZON_DELIVERY_GATEWAY_URL
OZON_DELIVERY_OAUTH_CLIENT_ID
OZON_DELIVERY_OAUTH_CLIENT_SECRET
RESEND_API_KEY
SUPABASE_SECRET_KEY
```

Не коммитить `.env`, `/etc/vzbadrys/vzbadrys.env`, SSH-ключи или значения из
Vercel в GitHub.

## Caddy: существующий Ozon Gateway

Файл `/etc/caddy/Caddyfile` уже обслуживает:

```caddyfile
api.xn--80abckmj9cj3h.xn--p1ai {
  handle /gateway-health {
    reverse_proxy 127.0.0.1:3001
  }
  handle /oauth/* {
    reverse_proxy 127.0.0.1:3001
  }
  handle /ozon/* {
    reverse_proxy 127.0.0.1:3001
  }
}
```

Эту секцию не удалять и не заменять при добавлении магазина.

## Подключение нового домена `vzbadris.ru`

Перед настройкой Caddy домен должен быть зарегистрирован и иметь записи в
REG.RU DNS:

| Тип | Имя | Значение |
| --- | --- | --- |
| A | `@` | `161.104.19.48` |
| A | `www` | `161.104.19.48` |

После появления DNS добавить отдельные Caddy-секции:

```caddyfile
vzbadris.ru {
  reverse_proxy 127.0.0.1:3000
}

www.vzbadris.ru {
  redir https://vzbadris.ru{uri} permanent
}
```

Затем проверить и применить конфигурацию:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

Caddy сам выпустит и будет обновлять HTTPS-сертификаты после того, как DNS
будет указывать на VPS.

До переключения изменить в `/etc/vzbadrys/vzbadrys.env` значение
`NEXT_PUBLIC_SITE_URL` на `https://vzbadris.ru` и перезапустить магазин:

```bash
systemctl restart vzbadrys
```

Старый домен `взбадрись.рф` желательно оставить и настроить для него
постоянный (301) редирект на `https://vzbadris.ru`, когда основной домен будет
проверен.

## Как обновлять сайт после перехода с Vercel

На сервере:

```bash
cd /opt/vzbadrys
git pull --ff-only origin main
corepack npm ci
NODE_OPTIONS=--max-old-space-size=1200 corepack npm run build
systemctl restart vzbadrys
systemctl --no-pager status vzbadrys
```

Проверки:

```bash
curl -fsS -o /dev/null -w 'storefront=%{http_code}\n' http://127.0.0.1:3000/
curl -fsS -o /dev/null -w 'ozon-gateway=%{http_code}\n' https://api.xn--80abckmj9cj3h.xn--p1ai/gateway-health
```

Если нужен откат к последнему коммиту, который был рабочим, сначала создать
снимок VPS в панели REG.Облако, затем переключить Git на нужный коммит,
пересобрать приложение и перезапустить сервис.
