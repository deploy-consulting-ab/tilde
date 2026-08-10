import { getHolidays } from '@/actions/flex/flex-actions';
import { getHomePageLinks } from '@/lib/external-links';
import { Spinner } from '@/components/ui/spinner';
import { getHomeRequiredDataForProfile } from '@/components/application/home/home-layout-selector';
import { DashboardHeader } from '@/components/application/home/dashboard-header';
import { refreshHome } from '@/components/application/home/refresh-home';
import { transformHolidaysData, getHolidayEmployeeInfo } from '@/lib/utils';
import { HolidaysCardComponent } from '@/components/application/home/dashboard-cards/holidays-card';
import { QuickLinksCardComponent } from '@/components/application/home/dashboard-cards/quick-links-card';

export async function SalesHomeComponent({ user }) {
    const { profileId, employeeNumber, name } = user;
    // Initialize data and errors
    let loading = true;

    const data = {
        holidays: null,
    };

    const errors = {
        holidays: null,
    };

    const dataRequirements = getHomeRequiredDataForProfile(profileId);
    const links = getHomePageLinks(profileId);

    if (dataRequirements.holidays) {
        try {
            const rawHolidays = await getHolidays(getHolidayEmployeeInfo(user));
            data.holidays = transformHolidaysData(rawHolidays);
        } catch (error) {
            errors.holidays = error.message || 'Failed to load holidays';
        }
    }

    // Transform quick links to match QuickLinksCard format
    const quickLinks = links.map((link) => ({
        title: link.title,
        description: link.description,
        href: link.href,
        icon: link.icon,
        external: link.target === '_blank',
    }));

    loading = false;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spinner size="lg" label="Loading dashboard..." />
            </div>
        );
    }

    return (
        <div className="h-full grid gap-4">
            <DashboardHeader name={name} />
            {/* Holidays Card */}
            <HolidaysCardComponent
                holidays={data.holidays}
                error={errors.holidays}
                isNavigationDisabled={false}
                refreshAction={refreshHome}
            />

            {/* Quick Links */}
            <QuickLinksCardComponent
                title="Quick Access"
                description="Frequently used resources and tools"
                links={quickLinks}
                columns={4}
            />
        </div>
    );
}
