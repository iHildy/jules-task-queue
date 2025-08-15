import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GitHub App Setup | Jules Task Queue",
  description: "Setting up your GitHub App installation for Jules Task Queue",
  robots: {
    index: false,
    follow: false,
  },
};

export default function GitHubAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
