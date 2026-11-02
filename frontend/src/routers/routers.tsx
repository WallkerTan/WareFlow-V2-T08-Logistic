import CompanyWarehouses from '../page/company/CompanyWarehouses';
import { createBrowserRouter, Navigate } from "react-router-dom";
import NotFound from "../page/NotFound";
import AuthLayout from "../layout/auth/AuthLayout";
import LoginPage from "../page/auth/LoginPage";
import RegisterPage from "../page/auth/RegisterPage";
import AdminLayout from "../layout/admin/AdminLayout";
import CompanyLayout from "../layout/company/CompanyLayout";
import StorehouseLayout from "../layout/storehouse/StorehouseLayout";
import CompanyProfile from "../page/company/CompanyProfile";
import StorehouseProfile from "../page/storehouse/StorehouseProfile";
import WareflowProfile from "../page/wareflow/WareflowProfile";
import ModalPreview from "../page/wareflow/ModalPreview";
import WarehouseManagement from "../page/wareflow/WarehouseManagement";
const router_wareflow_v2 = createBrowserRouter([
    { path: '/', element: <Navigate to="/wareflow/warehouses" replace /> },
    { path: '/wareflow', element: <AdminLayout />, children: [
        { index: true, element: <Navigate to="warehouses" replace /> },
        { path: 'warehouses', element: <WarehouseManagement /> },
        { path: 'profile', element: <WareflowProfile /> },
        { path: 'modal-preview', element: <ModalPreview /> },
    ] },
    { path: '/company', element: <CompanyLayout />, children: [
        { index: true, element: <Navigate to="warehouses" replace /> },
        { path: 'warehouses', element: <CompanyWarehouses /> },
        { path: 'profile', element: <CompanyProfile /> },
    ] },
    { path: '/storehouse', element: <StorehouseLayout />, children: [
        { index: true, element: <Navigate to="profile" replace /> },
        { path: 'profile', element: <StorehouseProfile /> },
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
        element: <NotFound />
    }
]);
export default router_wareflow_v2;

