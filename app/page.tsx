"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/api";

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    router.replace(isAuthenticated() ? "/dashboard" : "/login");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400">Loading...</p>
    </div>
  );
}
