'use client';

import AgoraRTC, { AgoraRTCProvider } from "agora-rtc-react";
import { ReactNode } from "react";

// Initialize the client once
const client = typeof window !== 'undefined' 
  ? AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }) 
  : null;

export default function AgoraProvider({ children }: { children: ReactNode }) {
  if (!client) return <>{children}</>; // Fallback for server-side
  return <AgoraRTCProvider client={client}>{children}</AgoraRTCProvider>;
}