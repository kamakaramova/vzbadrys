import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

export type EmailKind =
  | "payment_paid"
  | "order_confirmed"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "test";

interface SendEmailInput {
  db?: SupabaseClient | null;
  to: string;
  subject: string;
  html: string;
  kind: EmailKind;
  orderId?: string;
  dedupeKey?: string;
}

const DEFAULT_FROM = "взБАДрись <zakaz@mail.xn--80abckmj9cj3h.xn--p1ai>";
const DEFAULT_REPLY_TO = "vzbadris@yandex.ru";

async function writeLog(
  db: SupabaseClient | null | undefined,
  data: Record<string, unknown>
) {
  if (!db) return;
  const { error } = await db.from("email_logs").insert(data);
  if (error) console.error("email_logs insert failed:", error.message);
}

export async function sendEmail(input: SendEmailInput) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY не настроен");

  if (input.dedupeKey && input.db) {
    const { data } = await input.db
      .from("email_logs")
      .select("id")
      .eq("dedupe_key", input.dedupeKey)
      .eq("status", "sent")
      .maybeSingle();
    if (data) return { ok: true, duplicate: true };
  }

  const resend = new Resend(key);
  const createdAt = new Date().toISOString();
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      replyTo: process.env.EMAIL_REPLY_TO || DEFAULT_REPLY_TO,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    });
    if (error) throw new Error(error.message);

    await writeLog(input.db, {
      recipient: input.to,
      subject: input.subject,
      kind: input.kind,
      order_id: input.orderId || null,
      dedupe_key: input.dedupeKey || null,
      provider_id: data?.id || null,
      status: "sent",
      error: null,
      created_at: createdAt,
    });
    return { ok: true, id: data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось отправить письмо";
    await writeLog(input.db, {
      recipient: input.to,
      subject: input.subject,
      kind: input.kind,
      order_id: input.orderId || null,
      dedupe_key: input.dedupeKey || null,
      provider_id: null,
      status: "failed",
      error: message,
      created_at: createdAt,
    });
    throw error;
  }
}
