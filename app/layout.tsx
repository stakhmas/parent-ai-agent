import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Magic Parent AI | Personalized bedtime stories",
  description:
    "Create personalized therapeutic bedtime stories that help children sleep, grow, and feel safe.",
  openGraph: {
    title: "Magic Parent AI",
    description:
      "Personalized bedtime stories that help children sleep, grow, and feel safe.",
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
