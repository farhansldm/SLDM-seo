import { Route, Routes } from "react-router-dom";

import { DashboardPage } from "../features/dashboard/DashboardPage.jsx";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
    </Routes>
  );
}
