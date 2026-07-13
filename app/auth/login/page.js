import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { LoginFormComponent } from '@/components/auth/login-form';
import { LoginFormGoogleComponent } from '@/components/auth/login-form-google';
import { HOME_ROUTE } from '@/menus/routes';

export default async function LoginPage() {
    const session = await auth();

    if (session?.user?.isActive) {
        redirect(HOME_ROUTE);
    }

    const loginMethod = process.env.LOGIN_METHOD;

    return <>{loginMethod === 'google' ? <LoginFormGoogleComponent /> : <LoginFormComponent />}</>;
}
