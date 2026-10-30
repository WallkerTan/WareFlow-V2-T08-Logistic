import { createBrowserRouter, Navigate } from "react-router-dom";
import NotFound from "../page/NotFound";
import LandingPage from "../page/LandingPage";
import AuthLayout from "../layout/auth/AuthLayout";
import LoginPage from "../page/auth/LoginPage";
import RegisterPage from "../page/auth/RegisterPage";
import MainLayout from "../layout/main/MainLayout";
import CompanyProfile from "../page/company/CompanyProfile";
import StorehouseProfile from "../page/storehouse/StorehouseProfile";
import WareflowProfile from "../page/wareflow/WareflowProfile";
import ModalPreview from "../page/wareflow/ModalPreview";
const router_wareflow_v2 = createBrowserRouter([
    { path: "/", element: <MainLayout />, children: [
        { index: true, element: <Navigate to="/company/profile" replace /> },
        { path: 'company', element: <Navigate to="/company/profile" replace /> },
        { path: 'company/profile', element: <CompanyProfile /> },
        { path: 'storehouse', element: <Navigate to="/storehouse/profile" replace /> },
        { path: 'storehouse/profile', element: <StorehouseProfile /> },
        { path: 'wareflow', element: <Navigate to="/wareflow/profile" replace /> },
        { path: 'wareflow/profile', element: <WareflowProfile /> },
        { path: 'wareflow/modal-preview', element: <ModalPreview /> },
    ] },
    { path: "/login", element: <Navigate to="/auth/login" replace /> },
    { path: "/register", element: <Navigate to="/auth/register" replace /> },
    { path: "/auth", element: <AuthLayout />, children: [
        { index: true, element: <Navigate to="login" replace /> },
        { path: "login", element: <LoginPage /> },
        { path: "register", element: <RegisterPage /> },
    ] },
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
