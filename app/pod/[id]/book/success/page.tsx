"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

type Gateway = "yoco" | "paystack";

interface PendingBooking {
  podId: string;
  token: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  timeSlotNumber: string;
  bookingPurpose: string;
  shortDescription: string;
  amountInCents: number;
  paymentGateway?: Gateway;
  paymentReference?: string;
  yocoCheckoutId?: string;
  yocoMerchantId?: string;
  yocoPaymentFacilitator?: string;
}

type Status = "loading" | "success" | "unpaid" | "error";

function BookingSuccessInner() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const podId = params?.id as string;
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("pendingBooking");
    if (!raw) {
      router.replace(`/pod/${podId}/book`);
      return;
    }
    const booking: PendingBooking = JSON.parse(raw);

    // Gateway comes from what we stored before the redirect; the query string
    // is only a cross-check. Paystack appends ?reference=…&trxref=… itself.
    const gateway: Gateway =
      booking.paymentGateway || (search.get("gateway") as Gateway) || (booking.yocoCheckoutId ? "yoco" : "paystack");
    const reference =
      booking.paymentReference || search.get("reference") || search.get("trxref") || booking.yocoCheckoutId || "";

    const createBooking = async () => {
      const res = await fetch(`${BASE_URL}/user/create-booking/${booking.podId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${booking.token}`,
        },
        body: JSON.stringify({
          bookingDate: booking.bookingDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          timeSlotNumber: booking.timeSlotNumber,
          bookingPurpose: booking.bookingPurpose,
          shortDescription: booking.shortDescription,
          status: "Pending",
          amountInCents: booking.amountInCents,
          paymentGateway: gateway,
          paymentReference: reference,
          // Older backend fields, still sent for Yoco so nothing regresses.
          yocoCheckoutId: gateway === "yoco" ? booking.yocoCheckoutId || reference : undefined,
          yocoMerchantId: gateway === "yoco" ? booking.yocoMerchantId : undefined,
          yocoPaymentFacilitator: gateway === "yoco" ? booking.yocoPaymentFacilitator : undefined,
        }),
      });
      const d = await res.json();
      if (res.status === 402) {
        // Backend re-verified with the gateway and the payment is not complete.
        setStatus("unpaid");
        return;
      }
      if (!res.ok) throw new Error(d.message || "Booking failed");
      sessionStorage.removeItem("pendingBooking");
      setStatus("success");
    };

    const run = async () => {
      try {
        if (gateway === "paystack") {
          // Ask our backend to confirm with Paystack before creating anything.
          // The customer may also have pressed "Cancel" on the Paystack page,
          // which still lands here.
          const v = await fetch(`${BASE_URL}/user/paystack-verify/${encodeURIComponent(reference)}`);
          const vd = await v.json();
          if (!v.ok) throw new Error(vd.message || "Could not verify payment");
          if (!vd.paid) {
            setStatus("unpaid");
            return;
          }
        }
        await createBooking();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setStatus("error");
      }
    };
    run();
  }, [podId, router, search]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Confirming your payment and booking...</p>
      </div>
    );
  }

  if (status === "unpaid") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-2xl text-amber-600">!</div>
        <h2 className="text-xl font-bold text-gray-900">Payment Not Completed</h2>
        <p className="text-sm text-gray-500">No charge was made and no booking was created.</p>
        <button
          type="button"
          onClick={() => router.push(`/pod/${podId}/book`)}
          className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-semibold text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-2xl text-red-500">✕</div>
        <h2 className="text-xl font-bold text-gray-900">Booking Failed</h2>
        <p className="text-sm text-gray-500">{error}</p>
        <p className="text-xs text-gray-400">If your payment went through, please contact support and we will confirm your booking.</p>
        <button
          type="button"
          onClick={() => router.push(`/pod/${podId}/book`)}
          className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-semibold text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center space-y-5">
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl text-white bg-gradient-to-br from-orange-400 to-purple-500">
        ✓
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h2>
      <p className="text-gray-500 text-sm">Payment successful. Check your email for details.</p>
      <button
        type="button"
        onClick={() => router.push(`/pod/${podId}`)}
        className="px-6 py-3 rounded-2xl text-white font-semibold text-sm bg-gradient-to-r from-orange-400 to-purple-500"
      >
        Back to Pod
      </button>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BookingSuccessInner />
    </Suspense>
  );
}
