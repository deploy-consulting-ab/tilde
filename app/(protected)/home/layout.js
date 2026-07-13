import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebarComponent } from '@/components/application/sidebar/app-sidebar';
import { AppHeaderComponent } from '@/components/application/app-header';
import { requireAuth } from '@/lib/require-auth';

export default async function HomeLayout({ children }) {
    const session = await requireAuth();
    const { user } = session;
    return (
        <SidebarProvider
            style={{
                '--sidebar-width': '14rem',
                '--sidebar-width-mobile': '14rem',
            }}
        >
            <AppSidebarComponent user={user} location="home" />
            <SidebarInset className="bg-sidebar min-w-0 overflow-x-hidden">
                <AppHeaderComponent location="home" />
                <main className="flex-1 bg-background md:rounded-tl-3xl p-4 md:p-6">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
