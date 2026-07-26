import PaymentSuccessClient from "./PaymentSuccessClient";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order = "" } = await searchParams;
  return <PaymentSuccessClient orderId={order} />;
}
