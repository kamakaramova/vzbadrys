import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const CAMPAIGN_KEY = "review-collagen-2026-09-24";
const MIN_DAYS_AFTER_DELIVERY = 7;
const SEND_CONCURRENCY = 5;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
const resendSecret = process.env.RESEND_API_KEY;
const run = process.argv.includes("--send");

if (!url || !supabaseSecret || !resendSecret) {
  console.error("Campaign environment is not configured");
  process.exit(1);
}

const db = createClient(url, supabaseSecret, { auth: { persistSession: false, autoRefreshToken: false } });
const resend = new Resend(resendSecret);

function asRecord(value) {
  return value && typeof value === "object" ? value : {};
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function emailHtml(customerName) {
  const name = customerName || "Здравствуйте";
  const accountUrl = "https://xn--80abckmj9cj3h.xn--p1ai/account";
  const surveyUrl = "https://xn--80abckmj9cj3h.xn--p1ai/account?survey=collagen";
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0;background:#f7f3f0;font-family:Arial,sans-serif;color:#2d2926"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3f0;padding:24px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #f0e2da;border-radius:22px;overflow:hidden"><tr><td style="background:#fddcca;padding:24px 28px;text-align:center"><div style="font-size:24px;font-weight:800">вз<span style="color:#e8845a">БАД</span>рись</div><div style="font-size:12px;line-height:1.5;margin-top:5px;color:#8a5d47">Добавки с документами и заботой о Вас</div></td></tr><tr><td style="padding:32px 28px"><h1 style="font-size:25px;line-height:1.25;margin:0 0 14px">Как у Вас дела с добавкой?</h1><p style="font-size:16px;line-height:1.6;margin:0 0 18px;color:#5f5752">${escapeHtml(name)}, Ваш заказ уже должен быть с Вами. Как Вам добавка? Подошла ли она, заметили ли что-то по самочувствию?</p><p style="font-size:16px;line-height:1.65;margin:0 0 18px;color:#5f5752">Нам важен честный отзыв. Можно написать несколько предложений: что понравилось, что оказалось не таким, как ожидали, или почему пока рано делать выводы. Фото добавлять необязательно.</p><div style="margin:0 0 22px;padding:18px;border-radius:16px;background:#fff3ec"><p style="margin:0 0 6px;font-size:17px;font-weight:800">20 бонусов за отзыв</p><p style="margin:0;font-size:15px;line-height:1.6;color:#5f5752">За опубликованный отзыв мы начислим <b style="color:#c9693d">20 бонусов</b>. Их можно использовать при следующем заказе.</p></div><p style="font-size:18px;line-height:1.4;margin:0 0 10px;color:#c9693d;font-weight:800">Мы выбираем производство для коллагена</p><p style="font-size:16px;line-height:1.65;margin:0 0 18px;color:#5f5752">В личном кабинете появился короткий опрос: для чего Вы хотели бы коллаген, какой вкус выбрали бы и в каком формате его удобнее принимать. Ответы займут меньше минуты.</p><p style="margin:24px 0 12px"><a href="${accountUrl}" style="display:inline-block;background:#e8845a;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:8px">Оставить отзыв</a></p><p style="margin:0 0 20px"><a href="${surveyUrl}" style="display:inline-block;background:#fff;color:#c9693d;text-decoration:none;font-weight:700;padding:13px 21px;border:1px solid #e8845a;border-radius:8px">Выбрать коллаген</a></p><p style="font-size:14px;line-height:1.6;margin:0;color:#806f65">Если не помните пароль, на странице входа нажмите «Забыли пароль?» и создайте новый.</p><div style="margin:22px 0 0;padding:17px 18px;border:1px solid #f0e2da;border-radius:16px;background:#fffdfb"><p style="margin:0 0 6px;font-size:16px;font-weight:800">Есть вопрос по приёму добавки?</p><p style="margin:0;font-size:15px;line-height:1.6;color:#5f5752">Пишите нам на почту. Мы на связи, а нутрициолог Кама Карамова поможет сориентироваться в вопросах по приёму.</p></div><p style="font-size:16px;line-height:1.65;margin:20px 0 0;color:#5f5752">Спасибо, что выбираете «взБАДрись» и помогаете нам становиться лучше.</p></td></tr><tr><td style="padding:22px 28px;background:#fff8f4;border-top:1px solid #f0e2da"><p style="font-size:12px;line-height:1.55;margin:0;color:#806f65">Если Вы больше не хотите получать новости и предложения, ответьте на это письмо словом «Отписаться».</p></td></tr></table></td></tr></table></body></html>`;
}

const consented = new Set();
for (let page = 1; page <= 20; page += 1) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  for (const user of data.users ?? []) {
    const metadata = asRecord(user.user_metadata);
    if (asRecord(metadata.consents).marketing === true && user.email) consented.add(user.email.trim().toLowerCase());
  }
  if ((data.users ?? []).length < 1000) break;
}

const { data: orders, error: ordersError } = await db.from("payment_orders").select("status,customer,delivery,updated_at,created_at").eq("status", "paid");
if (ordersError) throw ordersError;
const cutoff = Date.now() - MIN_DAYS_AFTER_DELIVERY * 24 * 60 * 60 * 1000;
const recipients = new Map();
for (const order of orders ?? []) {
  const delivery = asRecord(order.delivery);
  if (delivery.orderStatus !== "delivered") continue;
  const deliveredAt = new Date(String(order.updated_at ?? order.created_at)).getTime();
  if (!Number.isFinite(deliveredAt) || deliveredAt > cutoff) continue;
  const customer = asRecord(order.customer);
  const email = String(customer.email ?? "").trim().toLowerCase();
  const orderConsent = Boolean(asRecord(customer.marketingConsent).acceptedAt);
  if (!validEmail(email) || (!consented.has(email) && !orderConsent) || recipients.has(email)) continue;
  recipients.set(email, { email, name: [customer.name, customer.surname].filter(Boolean).join(" ").trim() });
}

if (!run) {
  console.info(JSON.stringify({ recipients: recipients.size, dryRun: true }));
  process.exit(0);
}

let sent = 0;
let skipped = 0;
let failed = 0;
for (let index = 0; index < recipients.size; index += SEND_CONCURRENCY) {
  const batch = [...recipients.values()].slice(index, index + SEND_CONCURRENCY);
  const outcomes = await Promise.all(batch.map(async (recipient) => {
    const dedupeKey = `${CAMPAIGN_KEY}:${recipient.email}`;
    const { data: prior, error: priorError } = await db.from("email_logs").select("id").eq("dedupe_key", dedupeKey).eq("status", "sent").maybeSingle();
    if (priorError) throw priorError;
    if (prior) return "skipped";
    const createdAt = new Date().toISOString();
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || "взБАДрись <zakaz@mail.xn--80abckmj9cj3h.xn--p1ai>",
        replyTo: process.env.EMAIL_REPLY_TO || "vzbadris@yandex.ru",
        to: [recipient.email],
        subject: "Как у Вас дела с добавкой?",
        html: emailHtml(recipient.name),
      });
      if (error) throw new Error(error.message);
      const { error: logError } = await db.from("email_logs").insert({ recipient: recipient.email, subject: "Как у Вас дела с добавкой?", kind: "marketing_review_collagen", dedupe_key: dedupeKey, provider_id: data?.id || null, status: "sent", error: null, created_at: createdAt });
      if (logError) throw logError;
      return "sent";
    } catch (error) {
      await db.from("email_logs").insert({ recipient: recipient.email, subject: "Как у Вас дела с добавкой?", kind: "marketing_review_collagen", dedupe_key: dedupeKey, provider_id: null, status: "failed", error: error instanceof Error ? error.message : "send_failed", created_at: createdAt });
      return "failed";
    }
  }));
  sent += outcomes.filter((outcome) => outcome === "sent").length;
  skipped += outcomes.filter((outcome) => outcome === "skipped").length;
  failed += outcomes.filter((outcome) => outcome === "failed").length;
}

console.info(JSON.stringify({ recipients: recipients.size, sent, skipped, failed }));
