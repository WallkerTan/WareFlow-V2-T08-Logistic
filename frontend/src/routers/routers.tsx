import WarehouseMarketplace from "../page/company/WarehouseMarketplace";
import CompanyWarehouses from "../page/company/CompanyWarehouses";
import { createBrowserRouter, Navigate } from "react-router-dom";
import NotFound from "../page/NotFound";
import LandingPage from "../page/LandingPage";
import AuthLayout from "../layout/auth/AuthLayout";
import DashboardPage from "../page/DashboardPage";
import AdminDashboardPage from "../page/AdminDashboardPage";
import { getAuthSession } from "../services/authApi";
import type { ReactNode } from "react";
import AdminLayout from "../layout/admin/AdminLayout";
import WarehouseManagement from "../page/wareflow/WarehouseManagement";
import WareflowProfile from "../page/wareflow/WareflowProfile";
import ModalPreview from "../page/wareflow/ModalPreview";
import CompanyLayout from "../layout/company/CompanyLayout";
import CompanyProfile from "../page/company/CompanyProfile";
import StorehouseLayout from "../layout/storehouse/StorehouseLayout";
import StorehouseProfile from "../page/storehouse/StorehouseProfile";
import StockLots from "../page/storehouse/StockLots";
import LoginPage from "../page/auth/LoginPage";
import RegisterPage from "../page/auth/RegisterPage";

function RequireRole({
    role,
    children,
}: {
    role: string;
    children: ReactNode;
}) {
    const session = getAuthSession();
    if (!session?.accessToken) return <Navigate to="/auth/login" replace />;
    if (
        role === "NON_ADMIN"
            ? session.role !== "SYSTEM_ADMIN"
            : session.role === role
    )
        return children;
    return (
        <Navigate
            to={
                session.role === "SYSTEM_ADMIN"
                    ? "/admin/dashboard"
                    : "/dashboard"
            }
            replace
        />
    );
}

const router_wareflow_v2 = createBrowserRouter([
    { path: "/", element: <Navigate to="/wareflow/warehouses" replace /> },
    {
        path: "/wareflow",
        element: <AdminLayout />,
        children: [
            { index: true, element: <Navigate to="warehouses" replace /> },
            { path: "warehouses", element: <WarehouseManagement /> },
            { path: "profile", element: <WareflowProfile /> },
            { path: "modal-preview", element: <ModalPreview /> },
        ],
    },
    {
        path: "/company",
        element: <CompanyLayout />,
        children: [
            { index: true, element: <Navigate to="warehouses" replace /> },
            { path: "warehouses", element: <CompanyWarehouses /> },
            { path: "marketplace", element: <WarehouseMarketplace /> },
            { path: "profile", element: <CompanyProfile /> },
        ],
    },
    {
        path: "/storehouse",
        element: <StorehouseLayout />,
        children: [
            { index: true, element: <Navigate to="lots" replace /> },
            { path: "lots", element: <StockLots /> },
            { path: "profile", element: <StorehouseProfile /> },
        ],
    },
    { path: "/login", element: <Navigate to="/auth/login" replace /> },
    { path: "/register", element: <Navigate to="/auth/register" replace /> },
    {
        path: "/auth",
        element: <AuthLayout />,
        children: [
            { index: true, element: <Navigate to="login" replace /> },
            { path: "login", element: <LoginPage /> },
            { path: "register", element: <RegisterPage /> },
        ],
    },
    {
        path: "/dashboard",
        element: (
            <RequireRole role="NON_ADMIN">
                <DashboardPage />
            </RequireRole>
        ),
    },
    {
        path: "/admin/dashboard",
        element: (
            <RequireRole role="SYSTEM_ADMIN">
                <AdminDashboardPage />
            </RequireRole>
        ),
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

