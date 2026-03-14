"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/auth";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [confirmPassword,setConfirmPassword] = useState("");

  // handleRegister: Called when the register button is clicked.
  // It uses the auth helper to create an account, then redirects to login.
  const handleRegister = async () => {
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    const { user, error } = await registerUser(email, password);
    if (error) {
      alert(error.message);
      return;
    }

    // Supabase sends a confirmation email automatically.
    alert("Check your inbox to confirm your address.");
    router.push("/login");
    if(password !== confirmPassword){
  alert("Passwords do not match");
  return;
}
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6">Register</h1>

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
          className="w-full p-2 border rounded mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
  type="password"
  placeholder="Confirm Password"
  className="w-full p-2 border rounded mb-4"
  value={confirmPassword}
  onChange={(e)=>setConfirmPassword(e.target.value)}
/>
        <button
          onClick={handleRegister}
          className="w-full bg-black text-white p-2 rounded"
        >
          Register
        </button>
        <p className="text-sm text-center mt-4">
  Already have an account?{" "}
  <a
    href="/login"
    className="text-blue-600 hover:underline"
  >
    Login
  </a>
</p>
      <a href="/" className="text-sm text-gray-500 hover:underline">
← Back to Home
</a>
      </div>
    </div>
  );
}