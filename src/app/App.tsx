import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { restoreSession } from "../utils/store";
import { supabase } from "../lib/supabase";

export default function App() {
  // Restore Supabase auth session on app load (page refresh, first visit)
  useEffect(() => {
    restoreSession();
  }, []);

  // Listen for PASSWORD_RECOVERY event and redirect to /reset-password
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log("[PhysioBuddy] PASSWORD_RECOVERY detected in App.tsx — redirecting");
        if (window.location.pathname !== "/reset-password") {
          window.location.href = "/reset-password";
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <RouterProvider router={router} />;
}
