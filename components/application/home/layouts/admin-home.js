import { getHolidays, getAssignmentTimereportsForOccupancy } from '@/actions/flex/flex-actions';
import { getHomePageLinks } from '@/lib/external-links';
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

export async function AdminHomeComponent({ user, yearlyHolidays, carriedOverHolidays }) {
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

    const { flexEmployeeId, profileId, employeeNumber, name } = user;

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

    const quickLinks = links.map((link) => ({
        title: link.title,
        description: link.description,
        href: link.href,
        icon: link.icon,
        external: link.target === '_blank',
    }));

    return (
        <div className="min-h-screen pb-10">
            <DashboardHeader name={name} />

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
                <div className="flex flex-col gap-6">
                    <OccupancyRatesCardComponent
                        occupancy={data.occupancyRates}
                        error={errors.occupancyRates}
                        refreshAction={refreshHome}
                        target={85}
                    />
                    <StatisticsCardComponent
                        title="Assignments"
                        stats={data.assignmentsMetrics}
                        error={errors.assignmentsMetrics}
                        refreshAction={refreshHome}
                    />
                </div>

                <div className="flex flex-col gap-6">
                    <HolidaysCardComponent
                        holidays={data.holidays}
                        error={errors.holidays}
                        refreshAction={refreshHome}
                    />
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
