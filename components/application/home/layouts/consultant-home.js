import { getHolidays, getAssignmentTimereportsForOccupancy } from '@/actions/flex/flex-actions';
import { getHomePageLinks } from '@/lib/external-links';
import { Spinner } from '@/components/ui/spinner';
import { getAssignmentsMetrics } from '@/actions/salesforce/salesforce-actions';
import { refreshHome } from '@/components/application/home/refresh-home';
import {
    formatDateToISOString,
    getCurrentFiscalYear,
    getFiscalYearStartDate,
    getUTCToday,
    transformHolidaysData,
    transformTimereportsToOccupancy,
    transformStatisticsData,
    getHolidayEmployeeInfo,
} from '@/lib/utils';
import { getHomeRequiredDataForProfile } from '@/components/application/home/home-layout-selector';
import { DashboardHeader } from '@/components/application/home/dashboard-header';
import { HolidaysCardComponent } from '@/components/application/home/dashboard-cards/holidays-card';
import { OccupancyRatesCardComponent } from '@/components/application/home/dashboard-cards/occupancy-rates-card';
import { QuickLinksCardComponent } from '@/components/application/home/dashboard-cards/quick-links-card';
import { StatisticsCardComponent } from '@/components/application/home/dashboard-cards/statistics-card';

export async function ConsultantHomeComponent({ user }) {
    const { flexEmployeeId, profileId, employeeNumber, name } = user;

    // Initialize data and errors
    let loading = true;

    const data = {
        holidays: null,
        occupancyRates: null,
        assignmentsMetrics: null,
    };

    const errors = {
        holidays: null,
        occupancyRates: null,
        assignmentsMetrics: null,
    };

    // Determine what data this profile needs
    const dataRequirements = getHomeRequiredDataForProfile(profileId);
    const links = getHomePageLinks(profileId);

    // Fetch required data based on profile
    if (dataRequirements.holidays) {
        try {
            const rawHolidays = await getHolidays(getHolidayEmployeeInfo(user));
            data.holidays = transformHolidaysData(rawHolidays);
        } catch (error) {
            errors.holidays = error.message || 'Failed to load holidays';
        }
    }

    if (dataRequirements.occupancyRates) {
        try {
            const today = getUTCToday();
            const startDate = formatDateToISOString(getFiscalYearStartDate(getCurrentFiscalYear()));
            const endDate = formatDateToISOString(today);
            const rawTimereports = await getAssignmentTimereportsForOccupancy(
                flexEmployeeId,
                startDate,
                endDate
            );
            data.occupancyRates = transformTimereportsToOccupancy(rawTimereports);
        } catch (error) {
            errors.occupancyRates = error.message || 'Failed to load occupancy';
        }
    }

    if (dataRequirements.assignmentsMetrics) {
        try {
            const metrics = await getAssignmentsMetrics(employeeNumber);
            data.assignmentsMetrics = transformStatisticsData(metrics);
        } catch (error) {
            errors.assignmentsMetrics = error.message || 'Failed to load statistics';
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
        <div className="min-h-screen space-y-6">
            <DashboardHeader name={name} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content - Left Side */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Occupancy Rate Card - Team Capacity */}
                    <OccupancyRatesCardComponent
                        occupancy={data.occupancyRates}
                        error={errors.occupancyRates}
                        refreshAction={refreshHome}
                        target={85}
                    />

                    {/* Assignments Card */}
                    <StatisticsCardComponent
                        title="Assignments"
                        stats={data.assignmentsMetrics}
                        error={errors.assignmentsMetrics}
                        refreshAction={refreshHome}
                    />
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Holidays Card */}
                    <HolidaysCardComponent
                        holidays={data.holidays}
                        error={errors.holidays}
                        refreshAction={refreshHome}
                    />

                    {/* Quick Links */}
                    <QuickLinksCardComponent
                        title="Quick Access"
                        description="Access resources and support anytime"
                        links={quickLinks}
                    />
                </div>
            </div>
        </div>
    );
}
