"use client";

import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white">

  <Navbar />

  <section className="max-w-6xl mx-auto px-6 pt-25 pb-24 grid md:grid-cols-2 gap-10 items-center">

        <div>
          <h1 className="text-5xl font-bold leading-tight">
            Organize Tasks.
            <br />
            Work Together.
          </h1>

          <p className="mt-6 text-gray-300 text-lg">
            Manage tasks, collaborate with your team, and track progress
            in real-time with QuickTask.
          </p>

          <div className="mt-8 flex gap-4">

  <div className="mt-8 flex gap-4">

  <Link
    href="/register"
    className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-semibold"
  >
    Get Started
  </Link>

  <a
    href="#features"
    className="border border-gray-500 px-6 py-3 rounded-lg"
  >
    Learn More
  </a>

</div>

</div>
        </div>

        {/* HERO IMAGE CARD */}
        <div className="bg-white/10 backdrop-blur-lg p-10 rounded-2xl shadow-xl">
          <div className="h-56 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
            <p className="text-white text-xl">QuickTask Dashboard</p>
          </div>
        </div>

      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="max-w-6xl mx-auto px-6 py-20"
      >

        <h2 className="text-3xl font-bold text-center mb-16">
          Powerful Features
        </h2>

        <div className="grid md:grid-cols-3 gap-8">

          <div className="bg-white/10 backdrop-blur-lg p-8 rounded-xl">
            <h3 className="text-xl font-semibold mb-4">
              Task Management
            </h3>
            <p className="text-gray-300">
              Create, edit and manage tasks easily with priorities
              and due dates.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg p-8 rounded-xl">
            <h3 className="text-xl font-semibold mb-4">
              Real-time Sync
            </h3>
            <p className="text-gray-300">
              All updates happen instantly using realtime technology.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg p-8 rounded-xl">
            <h3 className="text-xl font-semibold mb-4">
              Team Collaboration
            </h3>
            <p className="text-gray-300">
              Share task lists and work together with your team.
            </p>
          </div>

        </div>

      </section>

    </main>
  );
}