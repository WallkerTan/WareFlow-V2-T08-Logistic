import LoginForm from '../../components/form/LoginForm';
import { authApi } from '../../services/authApi';
export default function LoginPage() { return <LoginForm onSubmit={authApi.login} />; }
