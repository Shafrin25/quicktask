export default function HowItWorks() {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-purple-900 to-black text-white">
      
      <h2 className="text-3xl font-bold text-center mb-16">
        How QuickTask Works
      </h2>

      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">

        <div className="bg-white/10 p-8 rounded-xl text-center">
          <h3 className="text-xl font-semibold mb-3">1. Create Account</h3>
          <p className="text-gray-300">
            Sign up and create your personal workspace instantly.
          </p>
        </div>

        <div className="bg-white/10 p-8 rounded-xl text-center">
          <h3 className="text-xl font-semibold mb-3">2. Add Tasks</h3>
          <p className="text-gray-300">
            Create tasks, set priorities and organize your work.
          </p>
        </div>

        <div className="bg-white/10 p-8 rounded-xl text-center">
          <h3 className="text-xl font-semibold mb-3">3. Collaborate</h3>
          <p className="text-gray-300">
            Work together with teammates and track progress easily.
          </p>
        </div>

      </div>
    </section>
  );
}