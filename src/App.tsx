"use client";

import { Toaster } from "sonner";
import Index from "./components/pages/Index";

export default function App() {
  return (
    <>
      <Toaster position="bottom-right" theme="dark" />
      <Index />
    </>
  );
}
