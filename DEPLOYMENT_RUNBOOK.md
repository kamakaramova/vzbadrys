# Развёртывание «взБАДрись»

Этот файл хранит техническую схему production-развёртывания. Пароли, ключи и
значения переменных окружения сюда **никогда не добавлять**.

## Текущая схема (проверено 4 ноября 2026)

```text
GitHub (kamakaramova/vzbadrys, ветка main)
       │
       ├── Vercel — вспомогательная сборка, НЕ production основного домена
       │
       └── VPS REG.Облако, Москва-3 — текущий production
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

- SSH для штатного деплоя доступен на порту `2222`; приложение и Ozon Gateway
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
5. Основной домен `vzbadris.ru` направлен на VPS. Кириллический домен
   `взбадрись.рф` сохранён и постоянно перенаправляет на латинский адрес с тем
   же путём и параметрами. Успешная сборка Vercel сама по себе не обновляет
   основной сайт.

## Автоматическая сверка бонусов

Существующий `vzbadrys-payment-sync.timer` каждые 30 минут запускает не только
сверку статусов оплаты Ozon, но и защищённую сверку бонусного журнала через
`POST /api/admin/bonus-stats/reconcile`.

- оплаченные заказы связываются с подтверждённым аккаунтом по email;
- пропущенный кэшбэк 1% доначисляется идемпотентно;
- начисления и списания уровня заказа используют стабильный технический
  `product_id`, поэтому повторный webhook не создаёт дубли;
- лишние начисления таймер сам не списывает: они остаются в красной сверке
  админки до безопасной ручной проверки, чтобы не уменьшить уже потраченный
  покупателем баланс.

Результат каждого запуска сохраняется в журнале systemd сервиса
`vzbadrys-payment-sync.service` без персональных данных и секретов.

## Автоматический контроль работоспособности

`vzbadrys-health-monitor.timer` запускает лёгкую проверку раз в 8 часов. Она
проверяет витрину, соединение с Supabase, Ozon Delivery Gateway, зависшие
платежи, целостность недавно оплаченных заказов и работу фоновой сверки
платежей/бонусов.

Письмо через Resend отправляется только при переходе из исправного состояния в
ошибку и один раз после восстановления. Повторяющиеся одинаковые ошибки не
создают рассылку. В письмах и systemd-журнале нет персональных данных
покупателей. Состояние хранится в `/var/lib/vzbadrys-monitor/state.json`.

Дополнительно GitHub Actions раз в 8 часов проверяет публичную витрину, health
endpoint и Ozon Gateway снаружи VPS. Эта проверка нужна на случай полной
недоступности самого сервера, когда он не сможет отправить письмо через Resend.

Полезные команды:

```bash
systemctl status vzbadrys-health-monitor.timer
systemctl start vzbadrys-health-monitor.service
journalctl -u vzbadrys-health-monitor.service -n 50 --no-pager
```

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

## Основной домен `vzbadris.ru`

Переключение выполнено 4 ноября 2026 года. В REG.RU DNS настроены записи:

| Тип | Имя | Значение |
| --- | --- | --- |
| A | `@` | `161.104.19.48` |
| A | `www` | `161.104.19.48` |

Актуальные Caddy-секции магазина:

```caddyfile
vzbadris.ru {
  reverse_proxy 127.0.0.1:3000
}

www.vzbadris.ru {
  redir https://vzbadris.ru{uri} permanent
}

xn--80abckmj9cj3h.xn--p1ai {
  redir https://vzbadris.ru{uri} permanent
}

www.xn--80abckmj9cj3h.xn--p1ai {
  redir https://vzbadris.ru{uri} permanent
}
```

После любых изменений проверить и применить конфигурацию:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

Caddy сам выпускает и обновляет HTTPS-сертификаты. Канонический адрес,
публичные ссылки и ссылки «Поделиться» задаются в `src/lib/siteUrl.ts`.

`NEXT_PUBLIC_SITE_URL` используется также в callback-адресах авторизации,
восстановления доступа, Ozon Delivery и Ozon Acquiring. Не менять эту
переменную только ради канонического домена: сначала нужно отдельно проверить
и обновить разрешённые callback URL у всех внешних сервисов. Старый домен
остаётся рабочим входом и безопасно переводит такие запросы на `vzbadris.ru`.

Для новых платежей Ozon Acquiring адреса `notificationUrl`, `successUrl` и
`failUrl` формируются напрямую на каноническом `https://vzbadris.ru`. Это
важно для webhook: Ozon может не повторить POST-запрос после перенаправления со
старого кириллического домена. Резервная сверка обращается к
`/v1/getOrderStatus` по полю `id` (идентификатор Ozon), а enum-статусы вида
`STATUS_PAID` нормализуются перед записью статуса заказа.

## Как обновлять production

Штатный путь не требует входа в панель REG.Облако. После локальных проверок:

1. Закоммитить только относящиеся к задаче файлы и отправить ветку `main`:

```bash
git push origin main
```

2. Проверить текущий коммит и состояние сервиса на VPS, используя уже
   настроенный проектный ключ. Содержимое ключа читать или выводить нельзя:

```bash
ssh -i /Users/kamalakaramova/.ssh/vzbadrys_deploy_ed25519 \
  -p 2222 -o BatchMode=yes -o ConnectTimeout=15 \
  root@161.104.19.48 \
  'git -C /opt/vzbadrys rev-parse --short HEAD; systemctl is-active vzbadrys'
```

Не использовать порт `22` и не подключаться без `-i`: это не штатное
подключение проекта и сервер закроет соединение. Не открывать панель REG.Облако
и не просить пользователя авторизоваться, пока этот SSH-путь работает.

Если SSH зависает до авторизации с ошибкой `Connection timed out during banner
exchange`, сначала проверить маршрут с ноутбука:

```bash
route -n get 161.104.19.48
```

Если в строке `interface` указан `utun*`, соединение уходит через VPN. Ключ при
этом не потерян и VPS перезапускать не нужно. Выполнить штатную проверку и
деплой напрямую через Wi-Fi, добавив `-B en0` к обычной SSH-команде:

```bash
ssh -B en0 -i /Users/kamalakaramova/.ssh/vzbadrys_deploy_ed25519 \
  -p 2222 -o BatchMode=yes -o ConnectTimeout=15 \
  root@161.104.19.48 /usr/local/sbin/deploy-vzbadrys
```

Если `en0` не является активным сетевым интерфейсом, сначала определить его по
`route -n get 161.104.19.48` и использовать фактический интерфейс обычного
интернет-подключения. Не отключать VPN целиком и не менять настройки системы,
если достаточно привязать только SSH-команду к нужному интерфейсу.

3. Запустить только защищённый скрипт деплоя:

```bash
ssh -i /Users/kamalakaramova/.ssh/vzbadrys_deploy_ed25519 \
  -p 2222 -o BatchMode=yes -o ConnectTimeout=15 \
  root@161.104.19.48 /usr/local/sbin/deploy-vzbadrys
```

Скрипт сам собирает приложение с `/etc/vzbadrys/vzbadrys.env`. Это критично:
`NEXT_PUBLIC_*` переменные встраиваются в браузерную сборку во время `build`.
Не запускать `npm run build` вручную без этого окружения — иначе могут перестать
работать авторизация, личный кабинет и другие клиентские интеграции.

4. Проверить коммит, сервис, витрину и Ozon Gateway:

```bash
ssh -i /Users/kamalakaramova/.ssh/vzbadrys_deploy_ed25519 \
  -p 2222 -o BatchMode=yes -o ConnectTimeout=15 \
  root@161.104.19.48 \
  'git -C /opt/vzbadrys rev-parse --short HEAD; \
   systemctl is-active vzbadrys; \
   curl -fsS -o /dev/null -w "storefront=%{http_code}\n" http://127.0.0.1:3000/; \
   curl -fsS -o /dev/null -w "ozon-gateway=%{http_code}\n" https://api.xn--80abckmj9cj3h.xn--p1ai/gateway-health'
```

После этого отдельно открыть изменённую публичную страницу на основном домене
и проверить её пользовательский сценарий. Только тогда считать публикацию
завершённой.

## Точка возврата перед Чёрной пятницей 2026

- Последняя production-версия до включения специальных цен: Git-тег
  `pre-black-friday-2026-11-10`, коммит `23120cee950108f4bb6931d71c0e54f4c53ad9d3`.
- Серверная копия кода и статических материалов:
  `/opt/vzbadrys-backups/pre-black-friday-20261110-1905.tar.gz`.
- В релизе Чёрной пятницы версия сохранённой корзины повышена до `5`, чтобы
  ранее добавленные товары автоматически получили акционные цены.

При возврате после акции не разворачивать старый тег напрямую: у покупателей
могут остаться корзины версии `5` с акционными ценами. Сделать новый
восстанавливающий коммит поверх `main`, вернуть витрину к коду из тега и
повысить версию корзины до `6`, миграцией восстановив цены до акции:
бисглицинат — 901 ₽, цитрат — 868 ₽, цинк + селен — 715 ₽, набор — 1 987 ₽.
После этого выполнить обычный защищённый деплой и снова проверить расчёт заказа.

Если нужен откат к последнему коммиту, который был рабочим, сначала создать
снимок VPS в панели REG.Облако, затем переключить Git на нужный коммит,
пересобрать приложение и перезапустить сервис.
