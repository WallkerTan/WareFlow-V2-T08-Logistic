import StorehouseInboundPage from "../page/storehouse/StorehouseInboundPage";
import StorehouseOutboundPage from "../page/storehouse/StorehouseOutboundPage";
import StorehouseHistoryPage from "../page/storehouse/StorehouseHistoryPage";
import AdminWarehousesNewPage from "../page/admin/AdminWarehousesNewPage";
import AdminCompanyDetailPage from "../page/admin/AdminCompanyDetailPage";
import AdminSuppliersNewPage from "../page/admin/AdminSuppliersNewPage";
import AdminProductsNewPage from "../page/admin/AdminProductsNewPage";
import CompanyDashboardPage from "../page/company/CompanyDashboardPage";
import CompanyInventoryPage from "../page/company/CompanyInventoryPage";
import CompanyFinancePage from "../page/company/CompanyFinancePage";
import CompanyEmployeesPage from "../page/company/CompanyEmployeesPage";
import CompanyTransfersPage from "../page/company/CompanyTransfersPage";
import CompanyApprovalsPage from "../page/company/CompanyApprovalsPage";
import CompanyBudgetNewPage from "../page/company/CompanyBudgetNewPage";
import CompanyEmployeesNewPage from "../page/company/CompanyEmployeesNewPage";
import CompanyTransfersNewPage from "../page/company/CompanyTransfersNewPage";
import StorehouseInventoryPage from "../page/storehouse/StorehouseInventoryPage";
import StorehouseFinancePage from "../page/storehouse/StorehouseFinancePage";
import StorehouseInboundNewPage from "../page/storehouse/StorehouseInboundNewPage";
import StorehouseOutboundNewPage from "../page/storehouse/StorehouseOutboundNewPage";
import StorehouseShipmentsPage from "../page/storehouse/StorehouseShipmentsPage";
import StorehouseShipmentsNewPage from "../page/storehouse/StorehouseShipmentsNewPage";
import { createBrowserRouter, Navigate, Link } from "react-router-dom";
import LandingPage from "../page/LandingPage";
import NotFound from "../page/NotFound";
import AuthLayout from "../layout/auth/AuthLayout";
import AdminLayout from "../layout/admin/AdminLayout";
import CompanyLayout from "../layout/company/CompanyLayout";
import StorehouseLayout from "../layout/storehouse/StorehouseLayout";
import LoginPage from "../page/auth/LoginPage";
import RegisterPage from "../page/auth/RegisterPage";
import ForgotPasswordPage from "../page/auth/ForgotPasswordPage";
import WarehouseManagement from "../page/wareflow/WarehouseManagement";
import WareflowProfile from "../page/wareflow/WareflowProfile";
import ModalPreview from "../page/wareflow/ModalPreview";
import CompanyWarehouses from "../page/company/CompanyWarehouses";
import WarehouseMarketplace from "../page/company/WarehouseMarketplace";
import CompanyProfile from "../page/company/CompanyProfile";
import StorehouseProfile from "../page/storehouse/StorehouseProfile";
import AdminDashboard from "../page/admin/AdminDashboard";
import AdminCompanies from "../page/admin/AdminCompanies";
import AdminFinance from "../page/admin/AdminFinance";
import AdminSuppliers from "../page/admin/AdminSuppliers";
import AdminProducts from "../page/admin/AdminProducts";
import AdminUsers from "../page/admin/AdminUsers";
import AdminLogs from "../page/admin/AdminLogs";
import AdminNotifications from "../page/admin/AdminNotifications";
const router = createBrowserRouter([
    { path: "/", element: <LandingPage /> },
    { path: "/LandingPage", element: <Navigate to="/" replace /> },
    {
        path: "/auth",
        element: <AuthLayout />,
        children: [
            { index: true, element: <Navigate to="login" replace /> },
            { path: "login", element: <LoginPage /> },
            { path: "register", element: <RegisterPage /> },
            { path: "forgot-password", element: <ForgotPasswordPage /> },
        ],
    },
    {
        path: "/admin",
        element: <AdminLayout />,
        children: [
            { index: true, element: <Navigate to="dashboard" replace /> },
            { path: "dashboard", element: <AdminDashboard /> },
            { path: "companies", element: <AdminCompanies /> },
            {
                path: "companies/:companyId",
                element: <AdminCompanyDetailPage />,
            },
            {
                path: "warehouses",
                element: (
                    <>
                        <WarehouseManagement />
                        <div className="workspace-quick">
                            <Link to="/admin/warehouses/new">
                                Tạo kho hàng →
                            </Link>
                        </div>
                    </>
                ),
            },
            {
                path: "suppliers",
                element: (
                    <>
                        <AdminSuppliers />
                        <div className="workspace-quick">
                            <Link to="/admin/suppliers/new">
                                Tạo nhà cung cấp →
                            </Link>
                        </div>
                    </>
                ),
            },
            {
                path: "products",
                element: (
                    <>
                        <AdminProducts />
                        <div className="workspace-quick">
                            <Link to="/admin/products/new">
                                Thêm sản phẩm cho nhà cung cấp →
                            </Link>
                        </div>
                    </>
                ),
            },
            { path: "finance", element: <AdminFinance /> },
            { path: "users", element: <AdminUsers /> },
            { path: "logs", element: <AdminLogs /> },
            { path: "notifications", element: <AdminNotifications /> },
            { path: "profile", element: <WareflowProfile /> },
            { path: "modal-preview", element: <ModalPreview /> },
            { path: "warehouses/new", element: <AdminWarehousesNewPage /> },
            { path: "suppliers/new", element: <AdminSuppliersNewPage /> },
            { path: "products/new", element: <AdminProductsNewPage /> },
        ],
    },
    {
        path: "/company",
        element: <CompanyLayout />,
        children: [
            { index: true, element: <Navigate to="dashboard" replace /> },
            { path: "dashboard", element: <CompanyDashboardPage /> },
            { path: "warehouses", element: <CompanyWarehouses /> },
            { path: "inventory", element: <CompanyInventoryPage /> },
            { path: "finance", element: <CompanyFinancePage /> },
            { path: "marketplace", element: <WarehouseMarketplace /> },
            { path: "profile", element: <CompanyProfile /> },
            { path: "employees", element: <CompanyEmployeesPage /> },
            { path: "transfers", element: <CompanyTransfersPage /> },
            { path: "approvals", element: <CompanyApprovalsPage /> },
            { path: "budget/new", element: <CompanyBudgetNewPage /> },
            { path: "employees/new", element: <CompanyEmployeesNewPage /> },
            { path: "transfers/new", element: <CompanyTransfersNewPage /> },
        ],
    },
    {
        path: "/storehouse",
        element: <StorehouseLayout />,
        children: [
            { index: true, element: <Navigate to="inventory" replace /> },
            { path: "inventory", element: <StorehouseInventoryPage /> },
            { path: "finance", element: <StorehouseFinancePage /> },
            { path: "profile", element: <StorehouseProfile /> },
            { path: "inbound", element: <StorehouseInboundPage /> },
            { path: "outbound", element: <StorehouseOutboundPage /> },
            { path: "history", element: <StorehouseHistoryPage /> },
            { path: "inbound/new", element: <StorehouseInboundNewPage /> },
            { path: "outbound/new", element: <StorehouseOutboundNewPage /> },
            { path: "shipments", element: <StorehouseShipmentsPage /> },
            { path: "shipments/new", element: <StorehouseShipmentsNewPage /> },
        ],
    },
    {
        path: "/wareflow/profile",
        element: <Navigate to="/admin/profile" replace />,
    },
    {
        path: "/wareflow/modal-preview",
        element: <Navigate to="/admin/modal-preview" replace />,
    },
    {
        path: "/wareflow/*",
        element: <Navigate to="/admin/warehouses" replace />,
    },
    {
        path: "/dashboard",
        element: <Navigate to="/company/dashboard" replace />,
    },
    { path: "/login", element: <Navigate to="/auth/login" replace /> },
    { path: "/register", element: <Navigate to="/auth/register" replace /> },
    { path: "*", element: <NotFound /> },
]);
export default router;
