import RegisterForm from '../../components/form/RegisterForm';
import { authApi } from '../../services/authApi';
export default function RegisterPage() { return <RegisterForm onSubmit={authApi.registerCompany} />; }
