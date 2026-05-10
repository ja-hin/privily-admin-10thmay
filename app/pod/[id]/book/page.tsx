"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";

/* ─── constants ─────────────────────────────────────────── */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const YOCO_PUBLIC_KEY = process.env.NEXT_PUBLIC_YOCO_PUBLIC_KEY || "";
const START_HOUR = 6;
const END_HOUR   = 24;
const ITEM_H     = 56;

/* ─── types ─────────────────────────────────────────────── */
interface Pod { _id: string; title: string; rate: number; timeSlot: string }
interface TimeSlot { hour: number; minute: number; index: number }
interface UserDetails { name: string; email: string; phone: string }

/* ─── helpers ───────────────────────────────────────────── */
function makeSlots(): TimeSlot[] {
  const out: TimeSlot[] = [];
  let i = 0;
  for (let h = START_HOUR; h < END_HOUR; h++)
    for (let m = 0; m < 60; m += 15)
      out.push({ hour: h, minute: m, index: i++ });
  return out;
}

function fmt(hour: number, minute: number) {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return { h: String(h).padStart(2, "0"), m: String(minute).padStart(2, "0"), ampm };
}

function slotsForDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function minutesFromSlots(start: TimeSlot, end: TimeSlot) {
  return Math.max(0, (end.hour * 60 + end.minute) - (start.hour * 60 + start.minute));
}

// Actual billable minutes: if booking starts in the current block today,
// charge from NOW not from the slot start time.
function billableMinutes(date: Date, start: TimeSlot, end: TimeSlot): number {
  const endMins   = end.hour * 60 + end.minute;
  let   startMins = start.hour * 60 + start.minute;

  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth()    === today.getMonth()    &&
    date.getDate()     === today.getDate();

  if (isToday) {
    const nowMins = today.getHours() * 60 + today.getMinutes();
    startMins = Math.max(startMins, nowMins); // charge from current minute if start is past
  }

  return Math.max(0, endMins - startMins);
}

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const DAYS   = ["M","T","W","T","F","S","S"];

/* ─── Drum Roll Picker ──────────────────────────────────── */
function DrumRoll({
  slots, selected, booked, onChange,
}: {
  slots: TimeSlot[];
  selected: number;
  booked: boolean[];
  onChange: (idx: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  useEffect(() => {
    if (!ref.current || isScrolling.current) return;
    ref.current.scrollTop = selected * ITEM_H;
  }, [selected]);

  function onScroll() {
    if (!ref.current) return;
    isScrolling.current = true;
    const idx = Math.round(ref.current.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(slots.length - 1, idx));
    if (clamped !== selected) onChange(clamped);
  }

  function onScrollEnd() {
    isScrolling.current = false;
    if (!ref.current) return;
    const idx = Math.round(ref.current.scrollTop / ITEM_H);
    ref.current.scrollTop = idx * ITEM_H;
  }

  return (
    <div className="relative flex-1 select-none" style={{ height: ITEM_H * 3 }}>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-14 bg-gradient-to-b from-white to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 bg-gradient-to-t from-white to-transparent" />
      <div
        className="pointer-events-none absolute inset-x-0 z-10"
        style={{ top: ITEM_H, height: ITEM_H, borderTop: "1.5px solid #e2e8f0", borderBottom: "1.5px solid #e2e8f0" }}
      />
      <div
        ref={ref}
        className="h-full overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory", scrollbarWidth: "none" }}
        onScroll={onScroll}
        onScrollEnd={onScrollEnd}
      >
        <div style={{ height: ITEM_H }} />
        {slots.map((s, i) => {
          const { h, m, ampm } = fmt(s.hour, s.minute);
          const isSelected = i === selected;
          const isBooked = booked[s.index];
          return (
            <div
              key={i}
              className="flex items-center justify-center gap-1"
              style={{ height: ITEM_H, scrollSnapAlign: "center" }}
            >
              <span className={`text-xl font-mono transition-all ${isSelected ? "font-bold text-gray-900 text-2xl" : "text-gray-400 text-base"} ${isBooked ? "line-through opacity-40" : ""}`}>
                {h}
              </span>
              <span className={`font-mono ${isSelected ? "font-bold text-gray-900 text-2xl" : "text-gray-400 text-base"}`}>:</span>
              <span className={`font-mono transition-all ${isSelected ? "font-bold text-gray-900 text-2xl" : "text-gray-400 text-base"} ${isBooked ? "line-through opacity-40" : ""}`}>
                {m}
              </span>
              <span className={`ml-1 text-sm font-semibold transition-all ${isSelected ? "text-gray-900" : "text-gray-300"}`}>
                {ampm}
              </span>
            </div>
          );
        })}
        <div style={{ height: ITEM_H }} />
      </div>
    </div>
  );
}

/* ─── Calendar ──────────────────────────────────────────── */
function buildCalendarMonths(count = 6) {
  const today = new Date();
  const months = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
}

function CalendarScreen({ onSelect }: { onSelect: (d: Date) => void }) {
  const [selected, setSelected] = useState<Date | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const calMonths = buildCalendarMonths(6);

  function firstDayOffset(year: number, month: number) {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  }

  function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-xl font-bold tracking-wide text-gray-900">
          <span className="text-amber-400">WHEN</span> DO YOU WANT TO BOOK?
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-8 pb-28">
        {calMonths.map(({ year, month }) => {
          const offset = firstDayOffset(year, month);
          const total  = daysInMonth(year, month);
          const cells  = Array.from({ length: offset + total });

          return (
            <div key={`${year}-${month}`}>
              <p className="text-sm font-semibold text-gray-600 mb-3">{MONTHS[month]} {year}</p>
              <div className="grid grid-cols-7 gap-y-1 text-center">
                {DAYS.map((d, i) => (
                  <span key={i} className="text-xs font-medium text-gray-400 py-1">{d}</span>
                ))}
                {cells.map((_, ci) => {
                  if (ci < offset) return <span key={ci} />;
                  const day  = ci - offset + 1;
                  const date = new Date(year, month, day);
                  date.setHours(0, 0, 0, 0);
                  const isPast  = date < today;
                  const isSel   = selected && date.getTime() === selected.getTime();
                  const isToday = date.getTime() === today.getTime();
                  return (
                    <button
                      key={ci}
                      disabled={isPast}
                      onClick={() => setSelected(date)}
                      className={`mx-auto w-9 h-9 rounded-full text-sm font-medium flex items-center justify-center transition-all
                        ${isPast ? "text-gray-300 cursor-not-allowed" : ""}
                        ${isSel  ? "bg-indigo-600 text-white shadow-md" : ""}
                        ${isToday && !isSel ? "border-2 border-indigo-400 text-indigo-600" : ""}
                        ${!isPast && !isSel && !isToday ? "text-gray-800 hover:bg-gray-200" : ""}
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 inset-x-0 px-5 py-4 bg-gray-50/90 backdrop-blur">
        <button
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
          className="w-full py-4 rounded-2xl text-white font-bold text-base tracking-wide transition-opacity disabled:opacity-40"
          style={{ background: selected ? "linear-gradient(90deg,#f97316,#a855f7)" : "#d1d5db" }}
        >
          CHOOSE TIME
        </button>
      </div>
    </div>
  );
}

/* ─── Time Screen ───────────────────────────────────────── */
function getInitialStartIdx(date: Date): number {
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth()    === today.getMonth()    &&
    date.getDate()     === today.getDate();

  if (!isToday) return 0; // future date → start from 6 AM

  // Round current time UP to the next 15-min slot
  const minutesFromStart = today.getHours() * 60 + today.getMinutes() - START_HOUR * 60;
  const idx = Math.floor(minutesFromStart / 15); // include current block (e.g. 11:11 → show 11:00)
  return Math.max(0, Math.min(idx, (END_HOUR - START_HOUR) * 4 - 1));
}

function TimeScreen({
  podId, date, onBack, onNext,
}: {
  podId: string;
  date: Date;
  onBack: () => void;
  onNext: (start: TimeSlot, end: TimeSlot) => void;
}) {
  const allSlots = makeSlots();

  // For today: hide past slots entirely
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth()    === today.getMonth()    &&
    date.getDate()     === today.getDate();
  const cutoffIdx   = isToday ? getInitialStartIdx(date) : 0;
  const visibleSlots = allSlots.slice(cutoffIdx);

  const [booked,   setBooked]   = useState<boolean[]>(Array(allSlots.length).fill(false));
  const [startIdx, setStartIdx] = useState(0); // index into visibleSlots
  const [endIdx,   setEndIdx]   = useState(Math.min(4, visibleSlots.length - 1));

  useEffect(() => {
    const ds = slotsForDate(date);
    fetch(`${BASE_URL}/product/availability/${podId}?booking_date=${ds}`)
      .then(r => r.json())
      .then(d => setBooked(d.product_availability?.slot_bookings || []))
      .catch(() => {});
  }, [podId, date]);

  function handleStartChange(idx: number) {
    setStartIdx(idx);
    if (idx >= endIdx) setEndIdx(Math.min(idx + 4, visibleSlots.length - 1));
  }

  function handleEndChange(idx: number) {
    setEndIdx(idx);
    if (idx <= startIdx) setStartIdx(Math.max(idx - 4, 0));
  }

  const startSlot = visibleSlots[startIdx];
  const endSlot   = visibleSlots[endIdx];
  const minutes   = minutesFromSlots(startSlot, endSlot);
  const startFmt  = fmt(startSlot.hour, startSlot.minute);
  const endFmt    = fmt(endSlot.hour, endSlot.minute);

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="px-4 pt-6 pb-2">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-lg">
          ←
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-28">
        <div>
          <p className="text-center text-sm font-bold tracking-widest text-gray-500 mb-3">
            START <span className="text-orange-400">TIME</span>
          </p>
          <div className="bg-gray-50 rounded-2xl overflow-hidden" style={{ height: ITEM_H * 3 }}>
            <DrumRoll slots={visibleSlots} selected={startIdx} booked={booked} onChange={handleStartChange} />
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            Selected: {startFmt.h}:{startFmt.m} {startFmt.ampm}
          </p>
        </div>

        <div>
          <p className="text-center text-sm font-bold tracking-widest text-gray-500 mb-3">
            END <span className="text-orange-400">TIME</span>
          </p>
          <div className="bg-gray-50 rounded-2xl overflow-hidden" style={{ height: ITEM_H * 3 }}>
            <DrumRoll slots={visibleSlots} selected={endIdx} booked={booked} onChange={handleEndChange} />
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            Selected: {endFmt.h}:{endFmt.m} {endFmt.ampm}
          </p>
        </div>

        {minutes > 0 && (
          <p className="text-center text-sm text-indigo-600 font-semibold">
            Duration: {minutes} minute{minutes !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 px-5 py-4 bg-white/90 backdrop-blur">
        <button
          disabled={minutes <= 0}
          onClick={() => onNext(startSlot, endSlot)}
          className="w-full py-4 rounded-2xl text-white font-bold text-base tracking-wide transition-opacity disabled:opacity-40"
          style={{ background: minutes > 0 ? "linear-gradient(90deg,#f97316,#a855f7)" : "#d1d5db" }}
        >
          PAYMENT SUMMARY
        </button>
      </div>
    </div>
  );
}

/* ─── Summary Screen ─────────────────────────────────────── */
function SummaryScreen({
  pod, date, startSlot, endSlot, onBack, onNext,
}: {
  pod: Pod;
  date: Date;
  startSlot: TimeSlot;
  endSlot: TimeSlot;
  onBack: () => void;
  onNext: (purpose: string, desc: string) => void;
}) {
  const [purpose, setPurpose] = useState("");
  const [desc,    setDesc]    = useState("");

  const minutes = billableMinutes(date, startSlot, endSlot);
  const slotMins = minutesFromSlots(startSlot, endSlot); // full slot duration for display
  const total   = minutes * pod.rate;
  const startF  = fmt(startSlot.hour, startSlot.minute);
  const endF    = fmt(endSlot.hour, endSlot.minute);
  const dateStr = date.toLocaleDateString("en-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="px-4 pt-6 pb-2 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-lg">←</button>
        <h2 className="font-bold text-gray-900 text-lg">Booking Summary</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-28">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Pod</p>
          <p className="font-bold text-gray-900 text-base">{pod.title}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Date</p>
            <p className="font-medium text-gray-800">{dateStr}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Start</p>
              <p className="font-semibold text-gray-800">{startF.h}:{startF.m} {startF.ampm}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">End</p>
              <p className="font-semibold text-gray-800">{endF.h}:{endF.m} {endF.ampm}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Duration</p>
            <p className="font-medium text-gray-800">{slotMins} min slot</p>
            {minutes < slotMins && (
              <p className="text-xs text-orange-500 mt-0.5">Charged from now → {minutes} billable min</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Rate</span>
            <span>R {pod.rate} / min</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Billable time</span>
            <span>{minutes} min</span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span className="text-indigo-600">R {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <p className="text-xs text-gray-400 uppercase font-semibold">Booking Purpose *</p>
          <div className="grid grid-cols-2 gap-2">
            {["Work", "Meeting", "Personal", "Study", "Other"].map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setPurpose(p)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${purpose === p ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Short description (optional)"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 px-5 py-4 bg-gray-50/90 backdrop-blur">
        <button
          type="button"
          disabled={!purpose}
          onClick={() => onNext(purpose, desc)}
          className={`w-full py-4 rounded-2xl text-white font-bold text-base tracking-wide transition-opacity disabled:opacity-40 ${purpose ? "bg-gradient-to-r from-orange-400 to-purple-500" : "bg-gray-300"}`}
        >
          CONFIRM BOOKING
        </button>
      </div>
    </div>
  );
}

/* ─── User Details Screen ────────────────────────────────── */
function DetailsScreen({
  pod, date, startSlot, endSlot, onBack, onPay, paying,
}: {
  pod: Pod;
  date: Date;
  startSlot: TimeSlot;
  endSlot: TimeSlot;
  onBack: () => void;
  onPay: (details: UserDetails) => void;
  paying: boolean;
}) {
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const minutes = billableMinutes(date, startSlot, endSlot);
  const total   = minutes * pod.rate;
  const valid   = name.trim() && email.trim() && phone.trim();

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="px-4 pt-6 pb-2 flex items-center gap-3">
        <button type="button" onClick={onBack} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-lg">←</button>
        <h2 className="font-bold text-gray-900 text-lg">Your Details</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-28">
        {/* Amount banner */}
        <div className="rounded-2xl p-4 text-white text-center bg-gradient-to-r from-orange-400 to-purple-500">
          <p className="text-xs font-semibold opacity-80 uppercase tracking-widest mb-1">Amount Due</p>
          <p className="text-3xl font-bold">R {total.toFixed(2)}</p>
          <p className="text-xs opacity-70 mt-1">{minutes} min @ R {pod.rate}/min</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Full Name *</label>
            <input
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Email Address *</label>
            <input
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Mobile Number *</label>
            <input
              type="tel"
              placeholder="+27 81 234 5678"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        {/* Secure payment note */}
        <div className="flex items-center gap-2 px-1">
          <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-xs text-gray-500">Payments are secure and processed by Yoco</p>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 px-5 py-4 bg-gray-50/90 backdrop-blur">
        <button
          type="button"
          disabled={!valid || paying}
          onClick={() => onPay({ name: name.trim(), email: email.trim(), phone: phone.trim() })}
          className={`w-full py-4 rounded-2xl text-white font-bold text-base tracking-wide transition-opacity disabled:opacity-40 flex items-center justify-center gap-2 ${valid ? "bg-gradient-to-r from-orange-400 to-purple-500" : "bg-gray-300"}`}
        >
          {paying ? (
            <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
          ) : `PAY R ${total.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */
export default function BookPage() {
  const params = useParams();
  const router = useRouter();
  const podId  = params?.id as string;

  const [step,      setStep]      = useState<1 | 2 | 3 | 4>(1);
  const [pod,       setPod]       = useState<Pod | null>(null);
  const [date,      setDate]      = useState<Date | null>(null);
  const [startSlot, setStartSlot] = useState<TimeSlot | null>(null);
  const [endSlot,   setEndSlot]   = useState<TimeSlot | null>(null);
  const [purpose,   setPurpose]   = useState("");
  const [desc,      setDesc]      = useState("");
  const [paying,    setPaying]    = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);

  useEffect(() => {
    if (!podId) return;
    fetch(`${BASE_URL}/product/${podId}`)
      .then(r => r.json())
      .then(setPod)
      .catch(console.error);
  }, [podId]);

  function handleDateSelect(d: Date) {
    setDate(d);
    setStep(2);
  }

  function handleTimeNext(start: TimeSlot, end: TimeSlot) {
    setStartSlot(start);
    setEndSlot(end);
    setStep(3);
  }

  function handleSummaryNext(p: string, d: string) {
    setPurpose(p);
    setDesc(d);
    setStep(4);
  }

  async function handlePay(details: UserDetails) {
    if (!date || !startSlot || !endSlot || !pod) return;

    setPaying(true);
    setError("");

    try {
      // Step 1: find-or-create user, get auth token
      const authRes = await fetch(`${BASE_URL}/user/web-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: details.email,
          phoneNumber: details.phone,
          firstname: details.name.split(" ")[0],
          lastname: details.name.split(" ").slice(1).join(" ") || details.name.split(" ")[0],
        }),
      });
      const authData = await authRes.json();
      if (!authRes.ok) throw new Error(authData.message || "Authentication failed");
      const token = authData.token;

      // Step 2: open Yoco popup
      const minutes       = billableMinutes(date, startSlot, endSlot);
      const total         = minutes * pod.rate;
      const amountInCents = Math.round(total * 100);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const YocoSDK = (window as any).YocoSDK;
      if (!YocoSDK) {
        setError("Payment SDK not loaded. Please refresh and try again.");
        setPaying(false);
        return;
      }

      const yoco = new YocoSDK({ publicKey: YOCO_PUBLIC_KEY });

      yoco.showPopup({
        amountInCents,
        currency: "ZAR",
        name: "Privily Pod Booking",
        description: pod.title,
        callback: async (result: { error?: { message: string }; id?: string }) => {
          if (result.error) {
            setError(result.error.message || "Payment failed. Please try again.");
            setPaying(false);
            return;
          }

          // Step 3: create booking
          try {
            const startTime = new Date(date);
            startTime.setHours(startSlot.hour, startSlot.minute, 0, 0);
            const endTime = new Date(date);
            endTime.setHours(endSlot.hour, endSlot.minute, 0, 0);

            const res = await fetch(`${BASE_URL}/user/create-booking/${podId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                bookingDate: date.toISOString(),
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                timeSlotNumber: String(startSlot.index),
                bookingPurpose: purpose,
                shortDescription: desc,
                status: "Pending",
                yocoToken: result.id,
                amountInCents,
              }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Booking failed");
            setSuccess(true);
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
          } finally {
            setPaying(false);
          }
        },
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPaying(false);
    }
  }

  /* ── success screen ─── */
  if (success) {
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

  return (
    <>
      {/* Yoco SDK */}
      <Script src="https://js.yoco.com/sdk/v1/yoco-sdk-web.js" strategy="lazyOnload" />

      {/* Global error toast */}
      {error && (
        <div className="fixed top-4 inset-x-4 z-50 bg-red-500 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {error}
          <button type="button" className="ml-3 font-bold" onClick={() => setError("")}>✕</button>
        </div>
      )}

      {step === 1 && <CalendarScreen onSelect={handleDateSelect} />}

      {step === 2 && date && (
        <TimeScreen
          podId={podId}
          date={date}
          onBack={() => setStep(1)}
          onNext={handleTimeNext}
        />
      )}

      {step === 3 && pod && date && startSlot && endSlot && (
        <SummaryScreen
          pod={pod}
          date={date}
          startSlot={startSlot}
          endSlot={endSlot}
          onBack={() => setStep(2)}
          onNext={handleSummaryNext}
        />
      )}

      {step === 4 && pod && date && startSlot && endSlot && (
        <DetailsScreen
          pod={pod}
          date={date}
          startSlot={startSlot}
          endSlot={endSlot}
          onBack={() => setStep(3)}
          onPay={handlePay}
          paying={paying}
        />
      )}

      {!pod && step === 1 && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </>
  );
}
