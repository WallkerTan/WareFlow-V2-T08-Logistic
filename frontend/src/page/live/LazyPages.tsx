import { lazy, Suspense } from 'react';
import { Loading } from '../../components/live/UI';
const Landing = lazy(() => import('../LandingPage'));
export function LandingPage() { return <Suspense fallback={<Loading />}><Landing /></Suspense>; }
export const FinancePage = lazy(() => import('./FinancePages'));
export const ShipmentsPage = lazy(() => import('./DeliveryPages'));
