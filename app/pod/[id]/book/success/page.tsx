"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function BookingSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const podId = params?.id as string;
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("pendingBooking");
    if (!raw) {
      router.replace(`/pod/${podId}/book`);
      return;
    }

    const booking = JSON.parse(raw);

    fetch(`${BASE_URL}/user/create-booking/${booking.podId}`, {
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
        yocoCheckoutId: booking.yocoCheckoutId,
        yocoMerchantId: booking.yocoMerchantId,
        yocoPaymentFacilitator: booking.yocoPaymentFacilitator,
      }),
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || "Booking failed");
        sessionStorage.removeItem("pendingBooking");
        setStatus("success");
      })
      .catch((e: Error) => {
        setError(e.message);
        setStatus("error");
      });
  }, [podId, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Confirming your booking...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-2xl text-red-500">✕</div>
        <h2 className="text-xl font-bold text-gray-900">Booking Failed</h2>
        <p className="text-sm text-gray-500">{error}</p>
        <p className="text-xs text-gray-400">Your payment was successful. Please contact support to confirm your booking.</p>
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
