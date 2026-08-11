import { SubcontractorHomeComponent } from '@/components/application/home/layouts/subcontractor-home';
import { ConsultantHomeComponent } from '@/components/application/home/layouts/consultant-home';
import { SalesHomeComponent } from '@/components/application/home/layouts/sales-home';
import { ManagementHomeComponent } from '@/components/application/home/layouts/management-home';
import { AdminHomeComponent } from '@/components/application/home/layouts/admin-home';

export async function ConsultantHomeLayout({ user }) {
    return <ConsultantHomeComponent user={user} />;
}

export async function SalesHomeLayout({ user }) {
    return <SalesHomeComponent user={user} />;
}

export async function SubcontractorHomeLayout({ user }) {
    return <SubcontractorHomeComponent user={user} />;
}

export async function ManagementHomeLayout({ user }) {
    return <ManagementHomeComponent user={user} />;
}

export async function AdminHomeLayout({ user }) {
    return <AdminHomeComponent user={user} />;
}
