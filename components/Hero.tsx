"use client";

import Link from "next/link";

export default function Hero() {
  return (
    <section className="text-center py-24 px-6">

      <h1 className="text-5xl font-bold mb-6">
        Organize Tasks. Work Together.
      </h1>

      <p className="text-lg text-gray-600 mb-10">
        Manage tasks, collaborate with your team, and track progress in real time with QuickTask.
      </p>

      <div className="flex justify-center gap-4">

        {/* GET STARTED */}
        <Link
          href="/login"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
        >
          Get Started
        </Link>

        {/* LEARN MORE */}
        <a
          href="#features"
          className="border border-gray-400 hover:bg-gray-100 px-6 py-3 rounded-lg font-medium transition"
        >
          Learn More
        </a>

      </div>

    </section>
  );
}