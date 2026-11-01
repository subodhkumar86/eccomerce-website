import { NextResponse } from "next/server";
import { onlinePaymentsAvailable } from "@/lib/payments";
import { upiAvailable } from "@/lib/upi";

export async function GET() {
  return NextResponse.json({ cod: true, upi: upiAvailable(), razorpay: await onlinePaymentsAvailable(), testMode: process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") ?? false }, { headers: { "Cache-Control": "no-store" } });
}
