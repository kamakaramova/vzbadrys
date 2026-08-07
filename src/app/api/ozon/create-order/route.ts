import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import type { Product } from "@/lib/products";
import {
  CURRENCY_CODE,
  createOrderSignature,
  getOzonConfig,
  postToOzon,
} from "@/lib/ozonAcquiring";
import { findReferralOwner, getAuthenticatedUser, getBonusBalance, normalizeCode, REFERRAL_DISCOUNT_PERCENT } from "@/lib/loyalty";
import { getServerSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type DeliveryMethod = "pickup" | "sdek_pvz" | "yandex_pvz" | "ozon_pvz" | "pochta";

interface CreateOrderBody {
  items?: { id?: string; quantity?: number }[];
  customer?: { name?: string; surname?: string; phone?: string; email?: string };
  delivery?: {
    method?: DeliveryMethod;
    city?: string;
    address?: string;
    zip?: string;
    priceKopecks?: number;
    pointId?: string;
    deliveryDescription?: string;
  };
  promoCode?: string;
  referralCode?: string;
  bonusPointsToSpend?: number;
  comment?: string;
  userId?: string;
  agreementAccepted?: boolean;
  marketingAccepted?: boolean;
}

interface OzonCreateOrderResponse {
  order?: { id?: string; payLink?: string; isTestMode?: boolean; status?: string };
}

const DELIVERY_PRICES: Record<DeliveryMethod, number> = {
  pickup: 0,
  sdek_pvz: 300,
  yandex_pvz: 300,
  ozon_pvz: 250,
  pochta: 250,
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function getBaseProductId(cartId: string) {
  return cartId.match(/^(.+)-(\d+)g$/)?.[1] ?? cartId;
}

function resolveProductPrice(product: Product, cartId: string) {
  const match = cartId.match(/^(.+)-(\d+)g$/);
  if (!match) return { price: product.price, stockAmount: 1 };
  const grams = Number(match[2]);
  const variant = product.weightVariants?.find((item) => item.grams === grams);
  if (!variant) throw new Error(`Не найдена фасовка товара ${product.name}`);
  return { price: variant.price, stockAmount: grams };
}

function distributeProductTotal(
  units: { extId: string; name: string; needMark: boolean; grossKopecks: number }[],
  targetKopecks: number
) {
  const grossTotal = units.reduce((sum, item) => sum + item.grossKopecks, 0);
  let allocated = 0;
  return units.map((item, index) => {
    const value = index === units.length - 1
      ? targetKopecks - allocated
      : Math.floor((item.grossKopecks / grossTotal) * targetKopecks);
    allocated += value;
    return { ...item, value };
  });
}

export async function POST(request: NextRequest) {
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "База данных не настроена" }, { status: 503 });

  let body: CreateOrderBody;
  try {
    body = await request.json();
  } catch {
    return badRequest("Некорректные данные заказа");
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
  const authUser = await getAuthenticatedUser(db, token);

  const customer = body.customer;
  const delivery = body.delivery;
  if (!body.agreementAccepted) return badRequest("Необходимо принять условия оферты");
  if (!customer?.name?.trim() || !customer.surname?.trim()) return badRequest("Укажите имя и фамилию");
  if ((customer.phone || "").replace(/\D/g, "").length !== 11) return badRequest("Проверьте номер телефона");
  if (!emailPattern.test(customer.email?.trim() || "")) return badRequest("Проверьте email");
  if (!delivery?.method || !(delivery.method in DELIVERY_PRICES)) return badRequest("Выберите способ доставки");
  if (!delivery.city?.trim() || !delivery.address?.trim()) return badRequest("Укажите адрес доставки или ПВЗ");

  const customerName = customer.name.trim();
  const customerSurname = customer.surname.trim();
  const customerPhone = customer.phone!;
  const customerEmail = customer.email!.trim().toLowerCase();
  const deliveryMethod = delivery.method;
  const deliveryCity = delivery.city.trim();
  const deliveryAddress = delivery.address.trim();

  const requestedItems = (body.items ?? []).filter(
    (item): item is { id: string; quantity: number } =>
      typeof item.id === "string" &&
      Number.isInteger(item.quantity) &&
      (item.quantity ?? 0) > 0 &&
      (item.quantity ?? 0) <= 50
  );
  if (requestedItems.length === 0 || requestedItems.length > 50) {
    return badRequest("Корзина пуста или содержит слишком много позиций");
  }

  const productIds = [...new Set(requestedItems.map((item) => getBaseProductId(item.id)))];
  const { data: productRows, error: productError } = await db
    .from("products")
    .select("id, data")
    .in("id", productIds);
  if (productError) return NextResponse.json({ error: "Не удалось проверить товары" }, { status: 500 });

  const productMap = new Map(
    (productRows ?? []).map((row) => [row.id as string, row.data as Product])
  );
  const orderLines: {
    cartId: string;
    productId: string;
    name: string;
    needMark: boolean;
    quantity: number;
    unitPrice: number;
    stockAmount: number;
    category: string;
  }[] = [];

  try {
    for (const item of requestedItems) {
      const productId = getBaseProductId(item.id);
      const product = productMap.get(productId);
      if (!product || !product.inStock) return badRequest("Один из товаров закончился. Обновите корзину");
      const resolved = resolveProductPrice(product, item.id);
      const requiredStock = resolved.stockAmount * item.quantity;
      if (typeof product.stockQty === "number" && product.stockQty < requiredStock) {
        return badRequest(`Недостаточно товара «${product.name}» в наличии`);
      }
      const grams = item.id.match(/^.+-(\d+)g$/)?.[1];
      orderLines.push({
        cartId: item.id,
        productId,
        name: grams ? `${product.name}, ${Number(grams) === 1000 ? "1 кг" : `${grams} г`}` : product.name,
        needMark: product.category === "bads",
        quantity: item.quantity,
        unitPrice: resolved.price,
        stockAmount: requiredStock,
        category: product.category,
      });
    }
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Не удалось проверить фасовку товара");
  }

  const subtotal = orderLines.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const promoCode = normalizeCode(body.promoCode);
  const referralCode = normalizeCode(body.referralCode);
  let promoPercent = 0;
  let referralPercent = 0;
  let referrerId: string | null = null;
  if (promoCode) {
    const { data: promo, error: promoError } = await db.from("promo_codes")
      .select("discount_percent, active, max_uses, usage_count, expires_at").eq("code", promoCode).maybeSingle();
    const isExpired = promo?.expires_at && new Date(promo.expires_at).getTime() < Date.now();
    const isExhausted = promo?.max_uses != null && Number(promo.usage_count) >= Number(promo.max_uses);
    if (promoError || !promo || !promo.active || isExpired || isExhausted) {
      return badRequest("Промокод не найден или больше не действует");
    }
    promoPercent = Number(promo.discount_percent);
  }
  if (referralCode) {
    try {
      const owner = await findReferralOwner(db, referralCode);
      if (!owner) return badRequest("Реферальный код не найден");
      if (owner.id === authUser?.id) return badRequest("Нельзя применить собственный реферальный код");
      referrerId = owner.id;
      referralPercent = REFERRAL_DISCOUNT_PERCENT;
    } catch (error) {
      return badRequest(error instanceof Error ? error.message : "Не удалось проверить реферальный код");
    }
  }
  // Считаем и округляем скидки по отдельности — так сумма на оплате совпадает
  // с двумя строками в корзине покупателя.
  const percentageDiscount = Math.round((subtotal * promoPercent) / 100)
    + Math.round((subtotal * referralPercent) / 100);
  const requestedBonusPoints = Math.max(0, Math.floor(Number(body.bonusPointsToSpend || 0)));
  let bonusSpent = 0;
  if (requestedBonusPoints) {
    if (!authUser) return badRequest("Войдите в личный кабинет, чтобы списать бонусы");
    const balance = await getBonusBalance(db, authUser.id, Number(authUser.user_metadata?.bonusPoints || 0));
    const maxBonus = Math.floor(subtotal * 0.3);
    if (requestedBonusPoints > balance) return badRequest("Недостаточно бонусов");
    if (requestedBonusPoints > maxBonus) return badRequest(`Бонусами можно оплатить не более ${maxBonus} ₽`);
    bonusSpent = requestedBonusPoints;
  }
  const discount = percentageDiscount + bonusSpent;
  const requestedPochtaPriceKopecks = Number(delivery.priceKopecks);
  if (deliveryMethod === "pochta" && subtotal < 3000 && (
    !Number.isInteger(requestedPochtaPriceKopecks)
    || requestedPochtaPriceKopecks < 0
    || requestedPochtaPriceKopecks > 100000
  )) {
    return badRequest("Выберите отделение Почты России, чтобы рассчитать доставку");
  }
  const deliveryPriceKopecks = subtotal >= 3000
    ? 0
    : deliveryMethod === "pochta"
      ? requestedPochtaPriceKopecks
      : DELIVERY_PRICES[deliveryMethod] * 100;
  const deliveryPrice = deliveryPriceKopecks / 100;
  const productsTotalKopecks = (subtotal - discount) * 100;
  const totalKopecks = productsTotalKopecks + deliveryPriceKopecks;

  const extId = `VZB-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8)}`.toUpperCase();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  let config: ReturnType<typeof getOzonConfig>;
  try {
    config = getOzonConfig();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ozon Acquiring не настроен" },
      { status: 503 }
    );
  }

  const paymentAlgorithm = "PAY_ALGO_SMS";
  const amountValue = String(totalKopecks);
  const requestSign = createOrderSignature({
    accessKey: config.accessKey,
    expiresAt,
    extId,
    fiscalizationType: config.fiscalizationType,
    paymentAlgorithm,
    amountValue,
    secretKey: config.secretKey,
  });

  const units = orderLines.flatMap((line) =>
    Array.from({ length: line.quantity }, (_, index) => ({
      extId: `${line.cartId}-${index + 1}`,
      name: line.name,
      needMark: line.needMark,
      grossKopecks: line.unitPrice * 100,
    }))
  );
  const discountedUnits = distributeProductTotal(units, productsTotalKopecks);
  const ozonItems = discountedUnits.map((item) => ({
    extId: item.extId,
    name: item.name.slice(0, 300),
    needMark: item.needMark,
    price: { currencyCode: CURRENCY_CODE, value: String(item.value) },
    quantity: 1,
    type: "TYPE_PRODUCT",
    vat: config.vat,
  }));
  if (deliveryPriceKopecks > 0) {
    ozonItems.push({
      extId: `delivery-${deliveryMethod}`,
      name: "Доставка заказа",
      needMark: false,
      price: { currencyCode: CURRENCY_CODE, value: String(deliveryPriceKopecks) },
      quantity: 1,
      type: "TYPE_SERVICE",
      vat: config.vat,
    });
  }

  const now = new Date().toISOString();
  const { error: insertError } = await db.from("payment_orders").insert({
    id: extId,
    status: "creating",
    amount_kopecks: totalKopecks,
    customer: {
      name: customerName,
      surname: customerSurname,
      phone: customerPhone,
      email: customerEmail,
      marketingConsent: body.marketingAccepted === true
        ? { acceptedAt: now, documentVersion: "2026-07-27" }
        : null,
    },
    items: orderLines,
    delivery: {
      method: deliveryMethod,
      city: deliveryCity,
      address: deliveryAddress,
      zip: delivery.zip?.trim() || "",
      price: deliveryPrice,
      pointId: deliveryMethod === "pochta" ? delivery.pointId?.trim() || "" : "",
      deliveryDescription: deliveryMethod === "pochta" ? delivery.deliveryDescription?.trim() || "" : "",
      promoPercent,
      referralPercent,
      discountAmount: discount,
    },
    promo_code: promoCode || null,
    referral_code: referralCode || null,
    referral_owner_id: referrerId,
    promo_discount_percent: promoPercent,
    referral_discount_percent: referralPercent,
    bonus_spent: bonusSpent,
    bonus_discount_amount: bonusSpent,
    comment: body.comment?.trim().slice(0, 1000) || null,
    user_id: authUser?.id || null,
    agreement_accepted_at: now,
    offer_version: "2026-07-21",
    created_at: now,
    updated_at: now,
  });
  if (insertError) {
    return NextResponse.json(
      { error: "Не удалось сохранить заказ. Проверьте таблицу payment_orders в Supabase" },
      { status: 500 }
    );
  }

  if (bonusSpent && authUser) {
    const { error: bonusError } = await db.from("bonus_ledger").insert({
      user_id: authUser.id,
      amount: -bonusSpent,
      kind: "order_payment",
      order_id: extId,
      status: "reserved",
    });
    if (bonusError) {
      await db.from("payment_orders").update({ status: "creation_failed", updated_at: new Date().toISOString() }).eq("id", extId);
      return NextResponse.json({ error: "Не удалось зарезервировать бонусы" }, { status: 500 });
    }
  }

  try {
    const ozonResponse = await postToOzon<OzonCreateOrderResponse>("/v1/createOrder", {
      accessKey: config.accessKey,
      amount: { currencyCode: CURRENCY_CODE, value: amountValue },
      deliverySettings: { isEnabled: false },
      enableFiscalization: true,
      expiresAt,
      extId,
      failUrl: `${config.siteUrl}/payment/fail?order=${encodeURIComponent(extId)}`,
      fiscalizationPhone: customerPhone.replace(/\D/g, ""),
      fiscalizationType: config.fiscalizationType,
      items: ozonItems,
      mode: "MODE_FULL",
      notificationUrl: `${config.siteUrl}/api/ozon/notification`,
      paymentAlgorithm,
      receiptEmail: customerEmail,
      requestSign,
      successUrl: `${config.siteUrl}/payment/success?order=${encodeURIComponent(extId)}`,
    });

    const ozonOrderId = ozonResponse.order?.id;
    const payLink = ozonResponse.order?.payLink;
    if (!ozonOrderId || !payLink || !payLink.startsWith("https://")) {
      throw new Error("Ozon не вернул платежную ссылку");
    }

    await db.from("payment_orders").update({
      ozon_order_id: ozonOrderId,
      ozon_pay_link: payLink,
      is_test: ozonResponse.order?.isTestMode ?? null,
      status: "awaiting_payment",
      updated_at: new Date().toISOString(),
    }).eq("id", extId);

    return NextResponse.json({ orderId: extId, payLink });
  } catch (error) {
    await db.from("payment_orders").update({
      status: "creation_failed",
      updated_at: new Date().toISOString(),
    }).eq("id", extId);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось открыть оплату Ozon" },
      { status: 502 }
    );
  }
}
