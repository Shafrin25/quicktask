"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full bg-purple-950 border-b border-purple-800">
  <div className="max-w-7xl mx-auto flex justify-between items-center px-8 py-5">

      {/* Logo */}
      <Link href="/" className="text-xl font-bold">
        QuickTask
      </Link>

      {/* Navigation */}
      <div className="flex items-center gap-4">

        <Link
          href="/login"
          className="px-4 py-2 rounded hover:bg-white/10"
        >
          Login
        </Link>

        <Link
          href="/register"
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-white"
        >
          Register
        </Link>

      </div>
  </div>
    </nav>
  );
}