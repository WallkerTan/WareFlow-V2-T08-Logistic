import { createBrowserRouter, Navigate } from "react-router-dom";
import NotFound from "../page/NotFound";
import LandingPage from "../page/LandingPage";
import AuthLayout from "../layout/auth/AuthLayout";
import LoginForm from "../components/form/LoginForm";
import RegisterForm from "../components/form/RegisterForm";

import AdminLayout from "../layout/admin/AdminLayout";
import AdminDashboard from "../page/admin/AdminDashboard";
import AdminCompanies from "../page/admin/AdminCompanies";
import AdminUsers from "../page/admin/AdminUsers";
import AdminWarehouses from "../page/admin/AdminWarehouses";
import AdminSuppliers from "../page/admin/AdminSuppliers";
import AdminProducts from "../page/admin/AdminProducts";
import AdminInventory from "../page/admin/AdminInventory";
import AdminShipments from "../page/admin/AdminShipments";
import AdminFinance from "../page/admin/AdminFinance";
import AdminNotifications from "../page/admin/AdminNotifications";
import AdminLogs from "../page/admin/AdminLogs";
import AdminSettings from "../page/admin/AdminSettings";

const router_wareflow_v2 = createBrowserRouter([
    { path: "/", element: <Navigate to="/auth/login" replace /> },
    { path: "/login", element: <Navigate to="/auth/login" replace /> },
    { path: "/register", element: <Navigate to="/auth/register" replace /> },
    {
        path: "/auth",
        element: <AuthLayout />,
        children: [
            { index: true, element: <Navigate to="login" replace /> },
            { path: "login", element: <LoginForm /> },
            { path: "register", element: <RegisterForm /> },
        ],
    },
    {
        path: "/admin",
        element: <AdminLayout />,
        children: [
            { index: true, element: <AdminDashboard /> },
            { path: "companies", element: <AdminCompanies /> },
            { path: "users", element: <AdminUsers /> },
            { path: "warehouses", element: <AdminWarehouses /> },
            { path: "suppliers", element: <AdminSuppliers /> },
            { path: "products", element: <AdminProducts /> },
            { path: "inventory", element: <AdminInventory /> },
            { path: "shipments", element: <AdminShipments /> },
            { path: "finance", element: <AdminFinance /> },
            { path: "notifications", element: <AdminNotifications /> },
            { path: "logs", element: <AdminLogs /> },
            { path: "settings", element: <AdminSettings /> },
        ],
    },
    {
        path: "*",
        element: <NotFound />,
    },
    {
        path: "/LandingPage",
        element: <LandingPage />,
    },
]);

export default router_wareflow_v2;