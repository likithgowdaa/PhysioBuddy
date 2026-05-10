// ============================================================
// ResetPassword.tsx — Password Reset Page
// ============================================================
// Handles the /reset-password route. Users land here after clicking
// the password reset email link. Supabase establishes a recovery
// session automatically via the URL token.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Activity, Lock, Eye, EyeOff } from "lucide-react";
import { resetPassword } from "../../services/authService";
import { supabase } from "../../lib/supabase";

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null); // null = checking

  // Verify that a valid recovery session exists
  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setSessionValid(true);
          console.log("[PhysioBuddy] Recovery session valid for:", user.email);
        } else {
          setSessionValid(false);
          setError("Invalid or expired reset link. Please request a new one.");
        }
      } catch {
        setSessionValid(false);
        setError("Invalid or expired reset link. Please request a new one.");
      }
    }
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword(password);

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Redirect to login after a short delay
      setTimeout(() => navigate("/"), 3000);
    } catch (err) {
      console.error("[PhysioBuddy] Reset password error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Activity className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-3xl font-semibold mb-2">Reset Password</h1>
            <p className="text-muted-foreground">
              Enter your new password below
            </p>
          </div>

          {success ? (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm text-center">
              ✅ Password updated successfully! Redirecting to login...
            </div>
          ) : sessionValid === null ? (
            <div className="text-center text-muted-foreground py-4">
              Verifying reset link...
            </div>
          ) : !sessionValid ? (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-center">
                {error || "Invalid or expired reset link. Please request a new one."}
              </div>
              <button
                onClick={() => navigate("/")}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl hover:bg-primary/90 transition-colors font-medium"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
