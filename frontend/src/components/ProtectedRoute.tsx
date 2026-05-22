import { Redirect } from "wouter";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const hasToken = !!localStorage.getItem("token");
  if (!hasToken) return <Redirect to="/login" />;
  return <>{children}</>;
}
