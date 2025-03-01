'use client';

import { Providers } from "@/app/providers";
import { fontSans } from "@/config/fonts";
import Navbar from "./Navbar";
import Footer from "./Footer";
import clsx from "clsx";

export default function RootLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </div>
    </Providers>
  );
} 