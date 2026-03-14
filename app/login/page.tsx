"use client";
import { useState, useEffect  } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "http://localhost:3000/dashboard"
    }
  });

  if (error) {
    console.error(error);
  }
};

  // Email Password Login
  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    const { user, error } = await loginUser(email, password);

    if (error) {
      alert(error.message);
      return;
    }

    if (user) {
      router.push("/dashboard");
    }
  };
  useEffect(() => {
  const checkSession = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      router.push("/dashboard");
    }
  };

  checkSession();
}, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Login to QuickTask
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
        />

        {/* Google Login */}
        <button
          onClick={signInWithGoogle}
          className="w-full bg-red-500 text-white p-2 rounded mb-4"
        >
          Sign in with Google
        </button>

        {/* Email Login */}
        <button
          className="w-full bg-black text-white p-2 rounded"
          onClick={handleLogin}
        >
          Login
        </button>
        <p className="text-sm text-center mt-4">
  New to QuickTask?{" "}
  <a href="/register" className="text-blue-600 hover:underline">
    Create an account
  </a>
</p>  
<a href="/" className="text-sm text-gray-500 hover:underline">
← Back to Home
</a>
      </div>
    </div>
  );
}