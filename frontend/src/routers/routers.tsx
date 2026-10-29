import { createBrowserRouter, Navigate } from "react-router-dom";
import NotFound from "../page/NotFound";
import LandingPage from "../page/LandingPage";
import AuthLayout from "../layout/auth/AuthLayout";
import LoginForm from "../components/form/LoginForm";
import RegisterForm from "../components/form/RegisterForm";

const router_wareflow_v2 = createBrowserRouter([
    { path: "/", element: <Navigate to="/auth/login" replace /> },
    { path: "/login", element: <Navigate to="/auth/login" replace /> },
    { path: "/register", element: <Navigate to="/auth/register" replace /> },
    { path: "/auth", element: <AuthLayout />, children: [
        { index: true, element: <Navigate to="login" replace /> },
        { path: "login", element: <LoginForm /> },
        { path: "register", element: <RegisterForm /> },
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
