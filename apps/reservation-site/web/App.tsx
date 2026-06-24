import { Navigate, Route, Routes } from "react-router-dom";
import ReservationPage from "./pages/ReservationPage";
import SuccessPage from "./pages/SuccessPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/reservation" replace />} />
      <Route path="/reservation" element={<ReservationPage />} />
      <Route path="/reservation/success" element={<SuccessPage />} />
      <Route path="*" element={<Navigate to="/reservation" replace />} />
    </Routes>
  );
}
