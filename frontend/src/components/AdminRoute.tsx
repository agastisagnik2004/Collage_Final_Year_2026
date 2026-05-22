import { Redirect } from "wouter";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const hasToken = !!localStorage.getItem("admin_token");
  if (!hasToken) return <Redirect to="/admin/login" />;
  return <>{children}</>;
}
