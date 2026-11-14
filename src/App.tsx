import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { ToastProvider } from "./components/Toast";
import AddWord from "./pages/AddWord";
import Categories from "./pages/Categories";
import Words from "./pages/Words";
import Login from "./pages/Login";
import Practice from "./pages/Practice";
import Settings from "./pages/Settings";
import { DBProvider, useDB } from "./state/DBContext";

function Guarded() {
  const { account } = useDB();
  return account ? <Layout /> : <Navigate to="/login" replace />;
}

function LoginRoute() {
  const { account } = useDB();
  return account ? <Navigate to="/practice" replace /> : <Login />;
}

export default function App() {
  return (
    <HashRouter>
      <DBProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route element={<Guarded />}>
              <Route path="/practice" element={<Practice />} />
              <Route path="/words" element={<Words />} />
              <Route path="/all" element={<Navigate to="/words" replace />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/add" element={<AddWord />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/practice" replace />} />
          </Routes>
        </ToastProvider>
      </DBProvider>
    </HashRouter>
  );
}
