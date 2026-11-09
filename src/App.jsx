
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import PatientDashboard from "./pages/PatientDashboard";
import PersonalDetails from "./pages/PersonalDetails";
import PatientHistory from "./pages/PatientHistory";
import Prescription from "./pages/Prescription";
import GetToken from "./pages/GetToken";
import QueueStatus from "./pages/QueueStatus";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminHistory from "./pages/AdminHistory";
import AdminProfile from "./pages/AdminProfile";
import QueueProvider from "./context/QueueContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./App.css";

function RequireSession({ role, children }) {
  const location = useLocation();
  const patient = sessionStorage.getItem("carequeue-current-patient");
  const admin = sessionStorage.getItem("carequeue-current-admin");

  if (role === "patient" && patient) return children;
  if (role === "admin" && admin) return children;
  if (role === "patient" && admin) return <Navigate to="/admin-dashboard" replace state={{ from: location }} />;
  if (role === "admin" && patient) return <Navigate to="/patient-dashboard" replace state={{ from: location }} />;
  return <Navigate to={role === "admin" ? "/admin-login" : "/login"} replace state={{ from: location }} />;
}

function AppRoutes() {
  const patient = (element) => <RequireSession role="patient">{element}</RequireSession>;
  const admin = (element) => <RequireSession role="admin">{element}</RequireSession>;

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/patient-dashboard" element={patient(<PatientDashboard />)} />
      <Route path="/personal-details" element={patient(<PersonalDetails />)} />
      <Route path="/patient-history" element={patient(<PatientHistory />)} />
      <Route path="/prescriptions" element={patient(<Prescription />)} />
      <Route path="/get-token" element={patient(<GetToken />)} />
      <Route path="/queue-status" element={patient(<QueueStatus />)} />
      <Route path="/admin-dashboard" element={admin(<AdminDashboard />)} />
      <Route path="/admin-history" element={admin(<AdminHistory />)} />
      <Route path="/admin-profile" element={admin(<AdminProfile />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueueProvider>
        <BrowserRouter><AppRoutes /></BrowserRouter>
      </QueueProvider>
    </ThemeProvider>
  );
}

export default App;
