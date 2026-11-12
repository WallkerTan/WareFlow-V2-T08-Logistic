import { createBrowserRouter, Navigate } from 'react-router-dom';
import LandingPage from '../page/LandingPage';
import NotFound from '../page/NotFound';
import AuthLayout from '../layout/auth/AuthLayout';
import AdminLayout from '../layout/admin/AdminLayout';
import CompanyLayout from '../layout/company/CompanyLayout';
import StorehouseLayout from '../layout/storehouse/StorehouseLayout';
import LoginPage from '../page/auth/LoginPage';
import RegisterPage from '../page/auth/RegisterPage';
import ForgotPasswordPage from '../page/auth/ForgotPasswordPage';
import RoleGuard from '../components/live/RoleGuard';
import { CompaniesPage, CompanyDetailPage, DashboardPage, EmployeesPage, LogsPage, NotificationsPage, PartnersPage, ProfilePage, SupplierProductsPage, WarehousesPage, WarehouseTransactionsPage } from '../page/live/CorePages';
import { AlertsPage, DocumentsPage, LotsPage, MovementsPage, ProductsPage } from '../page/live/InventoryPages';
import { FinancePage, ShipmentsPage } from '../page/live/LazyPages';
import ApprovalsPage from '../page/live/ApprovalsPage';
import HomeRedirect from '../components/live/HomeRedirect';
const router = createBrowserRouter([
    { path: '/', element: <LandingPage /> },
    { path: '/LandingPage', element: <Navigate to="/" replace /> },
    { path: '/auth', element: <AuthLayout />, children: [
        { index: true, element: <Navigate to="login" replace /> },
        { path: 'login', element: <LoginPage /> }, { path: 'register', element: <RegisterPage /> }, { path: 'forgot-password', element: <ForgotPasswordPage /> },
    ] },
    { path: '/admin', element: <RoleGuard role="SYSTEM_ADMIN"><AdminLayout /></RoleGuard>, children: [
        { index: true, element: <Navigate to="dashboard" replace /> }, { path: 'dashboard', element: <DashboardPage /> },
        { path: 'companies', element: <CompaniesPage /> }, { path: 'companies/:companyId', element: <CompanyDetailPage /> },
        { path: 'warehouses', element: <WarehousesPage /> }, { path: 'warehouses/new', element: <WarehousesPage /> },
        { path: 'suppliers', element: <PartnersPage /> }, { path: 'suppliers/new', element: <PartnersPage /> },
        { path: 'products', element: <SupplierProductsPage /> }, { path: 'products/new', element: <SupplierProductsPage /> },
        { path: 'warehouse-transactions', element: <WarehouseTransactionsPage /> }, { path: 'finance', element: <FinancePage /> },
        { path: 'inventory', element: <ProductsPage /> }, { path: 'lots', element: <LotsPage /> }, { path: 'alerts', element: <AlertsPage /> },
        { path: 'inbound', element: <DocumentsPage mode="PO" /> }, { path: 'receipts', element: <DocumentsPage mode="RECEIPT" /> },
        { path: 'outbound', element: <DocumentsPage mode="EXPORT" /> }, { path: 'stocktakes', element: <DocumentsPage mode="STOCKTAKE" /> },
        { path: 'adjustments', element: <DocumentsPage mode="ADJUST" /> }, { path: 'history', element: <MovementsPage /> },
        { path: 'shipments', element: <ShipmentsPage /> }, { path: 'logs', element: <LogsPage /> },
        { path: 'notifications', element: <NotificationsPage /> }, { path: 'profile', element: <ProfilePage /> },
        { path: 'users', element: <Navigate to="/admin/companies" replace /> }, { path: 'settings', element: <Navigate to="/admin/profile" replace /> },
    ] },
    { path: '/company', element: <RoleGuard role="COMPANY_ADMIN"><CompanyLayout /></RoleGuard>, children: [
        { index: true, element: <Navigate to="dashboard" replace /> }, { path: 'dashboard', element: <DashboardPage /> },
        { path: 'warehouses', element: <WarehousesPage own /> }, { path: 'marketplace', element: <WarehousesPage marketplace /> },
        { path: 'warehouse-transactions', element: <WarehouseTransactionsPage /> }, { path: 'inventory', element: <ProductsPage /> },
        { path: 'lots', element: <LotsPage /> }, { path: 'alerts', element: <AlertsPage /> },
        { path: 'suppliers', element: <PartnersPage /> }, { path: 'products', element: <SupplierProductsPage /> }, { path: 'customers', element: <PartnersPage customers /> },
        { path: 'employees', element: <EmployeesPage /> }, { path: 'employees/new', element: <EmployeesPage /> },
        { path: 'finance', element: <FinancePage /> }, { path: 'budget/new', element: <FinancePage initialTab="budgets" /> },
        { path: 'transfers', element: <DocumentsPage mode="EXPORT" transfers /> }, { path: 'transfers/new', element: <DocumentsPage mode="EXPORT" transfers /> },
        { path: 'inbound', element: <DocumentsPage mode="PO" /> }, { path: 'inbound/new', element: <DocumentsPage mode="PO" /> },
        { path: 'receipts', element: <DocumentsPage mode="RECEIPT" /> }, { path: 'outbound', element: <DocumentsPage mode="EXPORT" /> },
        { path: 'stocktakes', element: <DocumentsPage mode="STOCKTAKE" /> }, { path: 'adjustments', element: <DocumentsPage mode="ADJUST" /> },
        { path: 'history', element: <MovementsPage /> }, { path: 'shipments', element: <ShipmentsPage /> },
        { path: 'approvals', element: <ApprovalsPage /> }, { path: 'profile', element: <ProfilePage /> },
        { path: 'notifications', element: <NotificationsPage /> }, { path: 'logs', element: <LogsPage /> },
    ] },
    { path: '/storehouse', element: <RoleGuard role="WAREHOUSE_MANAGER"><StorehouseLayout /></RoleGuard>, children: [
        { index: true, element: <Navigate to="inventory" replace /> }, { path: 'inventory', element: <ProductsPage /> }, { path: 'lots', element: <LotsPage /> },
        { path: 'alerts', element: <AlertsPage /> }, { path: 'inbound', element: <DocumentsPage mode="PO" /> }, { path: 'inbound/new', element: <DocumentsPage mode="PO" /> },
        { path: 'receipts', element: <DocumentsPage mode="RECEIPT" /> }, { path: 'outbound', element: <DocumentsPage mode="EXPORT" /> }, { path: 'outbound/new', element: <DocumentsPage mode="EXPORT" /> },
        { path: 'stocktakes', element: <DocumentsPage mode="STOCKTAKE" /> }, { path: 'adjustments', element: <DocumentsPage mode="ADJUST" /> },
        { path: 'shipments', element: <ShipmentsPage /> }, { path: 'shipments/new', element: <ShipmentsPage /> },
        { path: 'history', element: <MovementsPage /> }, { path: 'finance', element: <FinancePage /> }, { path: 'budget', element: <FinancePage initialTab="budgets" /> },
        { path: 'suppliers', element: <PartnersPage /> }, { path: 'products', element: <SupplierProductsPage /> }, { path: 'customers', element: <PartnersPage customers /> },
        { path: 'profile', element: <ProfilePage /> }, { path: 'notifications', element: <NotificationsPage /> },
    ] },
    { path: '/dashboard', element: <HomeRedirect /> }, { path: '/login', element: <Navigate to="/auth/login" replace /> },
    { path: '/register', element: <Navigate to="/auth/register" replace /> }, { path: '/wareflow/profile', element: <Navigate to="/admin/profile" replace /> },
    { path: '/wareflow/*', element: <Navigate to="/admin/warehouses" replace /> }, { path: '*', element: <NotFound /> },
]);
export default router;
