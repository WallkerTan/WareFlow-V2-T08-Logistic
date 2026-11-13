import { mutate } from './api';
import { saveSession } from './session';
import type { Session } from './session';
export { getAuthSession, clearAuthSession } from './session';
export type AuthResponse = Session;
export type LoginRequest = { email: string; password: string; remember: boolean };
export type CompanyRegistrationRequest = { companyName: string; taxCode?: string; businessDescription?: string; businessModel: '' | 'FOOD' | 'TECH' | 'APPLIANCE' | 'FASHION' | 'OTHER'; fullName: string; phone: string; email: string; password: string };
export const authApi = {
    async login(values: LoginRequest) {
        const session = await mutate<Session>('core', '/auth/login', 'POST', { email: values.email.trim().toLowerCase(), password: values.password });
        saveSession(session, values.remember); return session;
    },
    registerCompany: (values: CompanyRegistrationRequest) => mutate<Session>('core', '/auth/register-company', 'POST', {
        companyName: values.companyName.trim(), businessModel: values.businessModel || null, taxCode: values.taxCode?.trim() || null, businessDescription: values.businessDescription?.trim() || null, fullName: values.fullName.trim(),
        phone: values.phone.replace(/[\s.-]/g, ''), email: values.email.trim().toLowerCase(), password: values.password,
    }),
};
