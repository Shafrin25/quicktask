export default function Features() {
  return (
    <section
      id="features"
      className="py-24 px-6 bg-gradient-to-b from-purple-900 to-black text-white"
    >
      <h2 className="text-3xl font-bold text-center mb-16">
        Powerful Features
      </h2>

      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">

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
  );
}