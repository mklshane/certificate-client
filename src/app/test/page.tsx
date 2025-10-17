"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function TestPage() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .get("/")
      .then((res) => setMessage(res.data.message))
      .catch((err) => setMessage("Error connecting to backend"));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">API Connection Test</h1>
      <p className="mt-4">{message}</p>
    </div>
  );
}
