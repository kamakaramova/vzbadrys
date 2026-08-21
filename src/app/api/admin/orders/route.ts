import { NextRequest, NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabaseServer";
import { emailAddressFromOrder, toEmailOrder, type PaymentOrderRow } from "@/lib/email/order";
import { sendEmail, type EmailKind } from "@/lib/email/send";
import { orderEmail, type OrderEmailStatus } from "@/lib/email/templates";
import { deliveryMethodLabel, paymentMethodLabel } from "@/lib/orderLabels";
import { getBonusBalance } from "@/lib/loyalty";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { allocateOrderStock, returnOrderStock } from "@/lib/stock";

const ORDER_STATUSES = new Set(["processing", "confirmed", "shipped", "delivered", "cancelled"]);

function mapOrder(row: Record<string, unknown>) {
  const customer = (row.customer ?? {}) as Record<string, string>;
  const delivery = (row.delivery ?? {}) as Record<string, unknown>;
  const items = ((row.items ?? []) as Record<string, unknown>[]).map((item) => ({
    id: String(item.cartId ?? item.productId ?? ""),
    name: String(item.name ?? "Товар"),
    price: Number(item.unitPrice ?? 0),
    quantity: Number(item.quantity ?? 1),
    category: String(item.category ?? ""),
  }));
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCost = Number(delivery.price ?? 0);
  const total = Number(row.amount_kopecks ?? 0) / 100;
  const discount = Math.max(0, subtotal + deliveryCost - total);
  const promoDiscountPercent = row.promo_code && subtotal > 0
    ? Number(delivery.promoPercent ?? Math.round((discount / subtotal) * 100))
    : undefined;
  const rawOrderStatus = String(delivery.orderStatus ?? "");
  const paymentStatus = String(row.status ?? "");
  const status = ORDER_STATUSES.has(rawOrderStatus)
    ? rawOrderStatus
    : ["payment_failed", "creation_failed", "payment_processing_error"].includes(paymentStatus)
      ? "cancelled"
      : "processing";
  const canDelete = paymentStatus !== "paid" || status === "cancelled";

  return {
    id: String(row.id),
    date: String(row.created_at ?? new Date().toISOString()),
    status,
    items,
    subtotal,
    discount,
    deliveryCost,
    total,
    promoCode: row.promo_code ? String(row.promo_code) : undefined,
    promoDiscountPercent,
    deliveryMethod: deliveryMethodLabel(delivery.method),
    deliveryAddress: [delivery.region, delivery.city, delivery.address].filter(Boolean).join(", "),
    deliveryRegion: String(delivery.region ?? ""),
    deliveryCity: String(delivery.city ?? ""),
    deliveryAddressLine: String(delivery.address ?? ""),
    paymentMethod: paymentMethodLabel(row.payment_method),
    paymentStatus,
    paidAt: row.paid_at ? String(row.paid_at) : undefined,
    stockWrittenOff: Boolean(row.stock_written_off),
    isTest: Boolean(row.is_test),
    canDelete,
    comment: row.comment ? String(row.comment) : undefined,
    trackNumber: delivery.trackNumber ? String(delivery.trackNumber) : undefined,
    userId: row.user_id ? String(row.user_id) : undefined,
    userName: [customer.name, customer.surname].filter(Boolean).join(" "),
    userEmail: customer.email ?? "",
    userPhone: customer.phone ?? "",
  };
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { data, error } = await db
    .from("payment_orders")
    .select("id,status,amount_kopecks,customer,items,delivery,promo_code,comment,user_id,payment_method,is_test,stock_written_off,paid_at,created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ orders: (data ?? []).map((row) => mapOrder(row)) });
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let body: {
    action?: string;
    orderId?: string;
    status?: string;
    trackNumber?: string;
    email?: string;
    phone?: string;
    region?: string;
    city?: string;
    address?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!body.orderId) {
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  }

  if (body.action === "contacts") {
    const email = body.email?.trim().toLowerCase() || "";
    const phone = body.phone?.trim() || "";
    const phoneDigits = phone.replace(/\D/g, "");
    const region = body.region?.trim() || "";
    const city = body.city?.trim() || "";
    const address = body.address?.trim() || "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Проверьте email покупателя" }, { status: 400 });
    }
    if (phoneDigits.length !== 11 || !["7", "8"].includes(phoneDigits[0])) {
      return NextResponse.json({ error: "Введите российский номер полностью: +7 и 10 цифр" }, { status: 400 });
    }
    if (!city || city.length > 120) {
      return NextResponse.json({ error: "Укажите город (не больше 120 символов)" }, { status: 400 });
    }
    if (!address || address.length > 500) {
      return NextResponse.json({ error: "Укажите адрес доставки или ПВЗ (не больше 500 символов)" }, { status: 400 });
    }
    if (region.length > 120) {
      return NextResponse.json({ error: "Регион слишком длинный" }, { status: 400 });
    }

    const { data: current, error: readError } = await db
      .from("payment_orders")
      .select("id,customer,delivery")
      .eq("id", body.orderId)
      .maybeSingle();
    if (readError || !current) {
      return NextResponse.json({ error: readError?.message ?? "order_not_found" }, { status: 404 });
    }

    const customer = (current.customer ?? {}) as Record<string, unknown>;
    const delivery = (current.delivery ?? {}) as Record<string, unknown>;
    if (delivery.method === "ozon_pvz" && !region) {
      return NextResponse.json({ error: "Для ПВЗ Ozon укажите регион, область или республику" }, { status: 400 });
    }

    const editedAt = new Date().toISOString();
    const { error } = await db
      .from("payment_orders")
      .update({
        customer: { ...customer, email, phone, adminEditedAt: editedAt },
        delivery: { ...delivery, region, city, address, adminEditedAt: editedAt },
        updated_at: editedAt,
      })
      .eq("id", body.orderId);
    if (error) return NextResponse.json({ error: "Не удалось сохранить данные заказа" }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

  if (!body.status || !ORDER_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const { data: current, error: readError } = await db
    .from("payment_orders")
    .select("id,status,amount_kopecks,customer,items,delivery,user_id,stock_written_off")
    .eq("id", body.orderId)
    .maybeSingle();
  if (readError || !current) {
    return NextResponse.json({ error: readError?.message ?? "order_not_found" }, { status: 404 });
  }

  const delivery = (current.delivery ?? {}) as Record<string, unknown>;
  const { error } = await db
    .from("payment_orders")
    .update({
      delivery: {
        ...delivery,
        orderStatus: body.status,
        trackNumber: body.trackNumber?.trim() || null,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.orderId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const previousOrderStatus = String(delivery.orderStatus ?? "processing");
  if (current.status === "paid" && body.status !== previousOrderStatus) {
    try {
      if (body.status === "cancelled" && previousOrderStatus !== "cancelled") {
        await returnOrderStock(db, body.orderId, "Отмена заказа администратором");
      } else if (previousOrderStatus === "cancelled" && body.status !== "cancelled") {
        const lines = (current.items ?? []) as { productId?: string; stockAmount?: number }[];
        await allocateOrderStock(
          db,
          body.orderId,
          lines.map((line) => ({ id: line.productId || "", amount: Number(line.stockAmount) })),
        );
      }
    } catch {
      await db.from("payment_orders").update({
        delivery,
        updated_at: new Date().toISOString(),
      }).eq("id", body.orderId);
      return NextResponse.json({ error: "Статус не изменён: не удалось обновить складские остатки" }, { status: 500 });
    }
  }

  let emailResult: "sent" | "skipped" | "failed" = "skipped";
  const previousTrackNumber = String(delivery.trackNumber ?? "").trim();
  const nextTrackNumber = body.trackNumber?.trim() || "";
  const emailStatuses = new Set(["confirmed", "shipped", "delivered", "cancelled"]);
  // Отмену можно безопасно сохранить повторно: sendEmail защитит от дубля,
  // а заказ, отменённый до появления функции, всё же получит уведомление.
  const shouldNotify = body.status === "cancelled"
    || body.status !== previousOrderStatus
    || (body.status === "shipped" && Boolean(nextTrackNumber) && nextTrackNumber !== previousTrackNumber);
  // Об отмене сообщаем всегда — в том числе когда покупатель не успел оплатить.
  // Остальные письма о движении заказа имеют смысл только после оплаты.
  const canSendStatusEmail = body.status === "cancelled" || current.status === "paid";
  if (canSendStatusEmail && shouldNotify && emailStatuses.has(body.status)) {
    const updatedOrder = {
      ...current,
      delivery: {
        ...delivery,
        orderStatus: body.status,
        trackNumber: body.trackNumber?.trim() || null,
      },
    } as PaymentOrderRow;
    const recipient = emailAddressFromOrder(updatedOrder);
    if (recipient) {
      const emailStatus = body.status as OrderEmailStatus;
      const emailOrder = toEmailOrder(updatedOrder);
      if (emailStatus === "delivered" && current.user_id) {
        try {
          const { data: userData } = await db.auth.admin.getUserById(String(current.user_id));
          const basePoints = Number(userData.user?.user_metadata?.bonusPoints || 0);
          emailOrder.bonusBalance = await getBonusBalance(db, String(current.user_id), basePoints);
        } catch {}
      }
      const message = orderEmail(emailStatus, emailOrder);
      try {
        await sendEmail({
          db,
          to: recipient,
          subject: message.subject,
          html: message.html,
          kind: `order_${emailStatus}` as EmailKind,
          orderId: body.orderId,
          // Новый трек-номер — это новое полезное уведомление, его не нужно
          // блокировать прежней записью о статусе «отправлен».
          dedupeKey: body.status === "shipped" && nextTrackNumber
            ? `${body.orderId}:order_shipped:${nextTrackNumber}`
            : `${body.orderId}:order_${emailStatus}`,
        });
        emailResult = "sent";
      } catch {
        emailResult = "failed";
      }
    }
  }

  return NextResponse.json({ ok: true, email: emailResult });
}

// Администратор может убрать только неоплаченный, отменённый или ошибочный заказ.
// Подтверждение требуется и в интерфейсе, и в самом API.
export async function DELETE(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const searchParams = new URL(request.url).searchParams;
  const orderId = searchParams.get("id") || "";
  if (searchParams.get("confirm") !== "true") {
    return NextResponse.json({ error: "Требуется подтверждение удаления" }, { status: 400 });
  }
  if (!/^VZB-\d{8}-[A-F0-9]{8}$/.test(orderId)) return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  const { data: order, error: readError } = await db.from("payment_orders").select("id, status, delivery, stock_written_off").eq("id", orderId).maybeSingle();
  if (readError || !order) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  const delivery = (order.delivery ?? {}) as Record<string, unknown>;
  const isCancelled = delivery.orderStatus === "cancelled";
  if (order.status === "paid" && !isCancelled) {
    return NextResponse.json({ error: "Оплаченный активный заказ удалить нельзя" }, { status: 403 });
  }
  if (order.status === "paid" && isCancelled && order.stock_written_off) {
    try {
      await returnOrderStock(db, orderId, "Удаление отменённого заказа");
    } catch {
      return NextResponse.json({ error: "Заказ не удалён: не удалось вернуть товар на склад" }, { status: 500 });
    }
  }
  const { error } = await db.from("payment_orders").delete().eq("id", orderId);
  if (error) return NextResponse.json({ error: "Не удалось удалить заказ" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
