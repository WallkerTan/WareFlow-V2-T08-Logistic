import { createBrowserRouter, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import NotFound from "../page/NotFound";
import LandingPage from "../page/LandingPage";
import AuthLayout from "../layout/auth/AuthLayout";
import LoginForm from "../components/form/LoginForm";
import RegisterForm from "../components/form/RegisterForm";
import DashboardPage from "../page/DashboardPage";
import AdminDashboardPage from "../page/AdminDashboardPage";
import { getAuthSession } from "../services/authApi";

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
    {
        path: "/",
        element: <MainLayout />,
        children: [
            {
                index: true,
                element: <Navigate to="/company/profile" replace />,
            },
            {
                path: "company",
                element: <Navigate to="/company/profile" replace />,
            },
            { path: "company/profile", element: <CompanyProfile /> },
            {
                path: "storehouse",
                element: <Navigate to="/storehouse/profile" replace />,
            },
            { path: "storehouse/profile", element: <StorehouseProfile /> },
            {
                path: "wareflow",
                element: <Navigate to="/wareflow/profile" replace />,
            },
            { path: "wareflow/profile", element: <WareflowProfile /> },
            { path: "wareflow/modal-preview", element: <ModalPreview /> },
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
