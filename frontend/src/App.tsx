import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Schedule from "./pages/Schedule";
import Dashboard from "./pages/Dashboard";
import RoleSelect from "./pages/RoleSelect";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

function HomeRedirect() {
  const hasToken = !!localStorage.getItem("token");
  const hasAdminToken = !!localStorage.getItem("admin_token");
  if (hasAdminToken) return <Redirect to="/admin/dashboard" />;
  if (hasToken) return <Redirect to="/dashboard" />;
  return <Redirect to="/select-role" />;
}

export default function App() {
  return (
    <WouterRouter>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/select-role" component={RoleSelect} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/schedule">
          <ProtectedRoute><Schedule /></ProtectedRoute>
        </Route>
        <Route path="/dashboard">
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        </Route>
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/dashboard">
          <AdminRoute><AdminDashboard /></AdminRoute>
        </Route>
        <Route><HomeRedirect /></Route>
      </Switch>
    </WouterRouter>
  );
}
