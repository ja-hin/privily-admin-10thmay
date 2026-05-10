"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Feature {
  _id: string;
  name: string;
  icon: string;
}

interface Location {
  _id: string;
  name: string;
  Street: string;
  city: string;
  state: string;
  country_code: string;
  zip: string;
  latitude: number;
  longitude: number;
}

interface Rating {
  star: number;
  comment: string;
  createdAt: string;
}

interface Pod {
  _id: string;
  title: string;
  description: string;
  rate: number;
  direction: string;
  booking_requirements: string;
  cancellation_policy: string;
  safety_and_property: string;
  availability: string;
  timeSlot: string;
  isAvailable: boolean;
  isBlocked: boolean;
  totalRating: string;
  features: Feature[];
  location: Location;
  images: { url: string; public_id: string }[];
  ratings: Rating[];
  category?: { _id: string; title: string };
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function PodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [pod, setPod] = useState<Pod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${BASE_URL}/product/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setPod(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Loading pod details…</p>
        </div>
      </div>
    );
  }

  if (error || !pod) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="text-5xl">🏢</div>
          <h2 className="text-xl font-bold text-gray-800">Pod not found</h2>
          <p className="text-gray-500 text-sm">This pod may have been moved or removed.</p>
        </div>
      </div>
    );
  }

  const avgRating =
    pod.ratings?.length > 0
      ? pod.ratings.reduce((s, r) => s + r.star, 0) / pod.ratings.length
      : 0;

  const hasImages = pod.images && pod.images.length > 0 && !imgError;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-sm px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm font-bold">P</span>
        </div>
        <span className="font-semibold text-gray-800 text-sm">Privily</span>
        <span className="ml-auto">
          {pod.isAvailable && !pod.isBlocked ? (
            <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">Available</span>
          ) : (
            <span className="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-medium">Unavailable</span>
          )}
        </span>
      </div>

      {/* Image Gallery */}
      <div className="relative bg-gray-900">
        {hasImages ? (
          <>
            <img
              src={pod.images[activeImg].url}
              alt={pod.title}
              className="w-full h-64 object-cover"
              onError={() => setImgError(true)}
            />
            {pod.images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImg((i) => (i - 1 + pod.images.length) % pod.images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg"
                >‹</button>
                <button
                  onClick={() => setActiveImg((i) => (i + 1) % pod.images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg"
                >›</button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {pod.images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${i === activeImg ? "bg-white" : "bg-white/40"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-64 flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
            <span className="text-7xl">🏢</span>
          </div>
        )}
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Title & Location */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pod.title}</h1>
          {pod.location && (
            <p className="text-gray-500 text-sm mt-1">
              📍 {pod.location.name}{pod.location.city ? `, ${pod.location.city}` : ""}
              {pod.location.state ? `, ${pod.location.state}` : ""}
            </p>
          )}
        </div>

        {/* Key Info Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Rate</p>
            <p className="text-lg font-bold text-indigo-600">R {pod.rate}</p>
            <p className="text-xs text-gray-400">/ hour</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Time Slot</p>
            <p className="text-sm font-semibold text-gray-800">{pod.timeSlot}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Rating</p>
            {avgRating > 0 ? (
              <>
                <p className="text-lg font-bold text-yellow-500">⭐ {avgRating.toFixed(1)}</p>
                <p className="text-xs text-gray-400">{pod.ratings.length} reviews</p>
              </>
            ) : (
              <p className="text-sm text-gray-400 mt-2">No reviews</p>
            )}
          </div>
        </div>

        {/* Features */}
        {pod.features && pod.features.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {pod.features.map((f) => (
                <span
                  key={f._id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium"
                >
                  {f.icon && <span>{f.icon}</span>}
                  {f.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {pod.description && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">About this Pod</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{pod.description}</p>
          </div>
        )}

        {/* Address */}
        {pod.location && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Address</h2>
            <p className="text-sm text-gray-600">
              {[pod.location.Street, pod.location.city, pod.location.state, pod.location.zip, pod.location.country_code]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        )}

        {/* Booking Requirements */}
        {pod.booking_requirements && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">📋 Booking Requirements</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{pod.booking_requirements}</p>
          </div>
        )}

        {/* Cancellation Policy */}
        {pod.cancellation_policy && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">🔄 Cancellation Policy</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{pod.cancellation_policy}</p>
          </div>
        )}

        {/* Safety */}
        {pod.safety_and_property && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">🛡️ Safety &amp; Property</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{pod.safety_and_property}</p>
          </div>
        )}

        {/* Reviews */}
        {pod.ratings && pod.ratings.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Reviews</h2>
            <div className="space-y-3">
              {pod.ratings.slice(0, 5).map((r, i) => (
                <div key={i} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <span key={s} className={`text-sm ${s < r.star ? "text-yellow-400" : "text-gray-200"}`}>★</span>
                    ))}
                    <span className="text-xs text-gray-400 ml-1">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Book Now CTA */}
        {pod.isAvailable && !pod.isBlocked && (
          <button
            type="button"
            onClick={() => router.push(`/pod/${id}/book`)}
            className="w-full py-4 rounded-2xl text-white font-bold text-base tracking-wide bg-gradient-to-r from-orange-400 to-purple-500"
          >
            BOOK NOW
          </button>
        )}

        {/* Get Directions CTA */}
        {pod.direction && (
          <a
            href={pod.direction}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-white border border-gray-200 text-gray-700 font-semibold py-3.5 rounded-xl transition-colors text-sm"
          >
            🗺️ Get Directions
          </a>
        )}

        {/* Footer */}
        <div className="text-center pt-2 pb-6">
          <p className="text-xs text-gray-400">Powered by <span className="font-semibold text-indigo-500">Privily</span></p>
        </div>
      </div>
    </div>
  );
}
