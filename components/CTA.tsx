import Link from "next/link";

export default function CTA() {
  return (
    <section className="py-24 text-center bg-purple-900 text-white">

      <h2 className="text-3xl font-bold mb-6">
        Ready to organize your tasks?
      </h2>

      <p className="text-gray-300 mb-8">
        Start using QuickTask today and improve your productivity.
      </p>

      <Link
        href="/register"
        className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-lg font-semibold"
      >
        Get Started Free
      </Link>

    </section>
  );
}