import { auth } from '@/auth';
import { OccupancyListComponent } from '@/components/application/occupancy/occupancy-list';
import { OccupancyStatsComponent } from '@/components/application/occupancy/occupancy-stats';
import {
    formatDateToISOString,
    getUTCToday,
    getCurrentFiscalYear,
    getFiscalYearStartDate,
} from '@/lib/utils';
import {
    getFlexOccupancyStatsAnchored,
    getFlexOccupancyHistory,
} from '@/actions/flex/flex-actions';
import { OCCUPANCY_STATS_ROUTE } from '@/menus/routes';

export default async function OccupancyStatsPage() {
    const session = await auth();
    const flexEmployeeId = session.user.flexEmployeeId;

    const today = getUTCToday();
    const formattedToday = formatDateToISOString(today);

    const currentFY = getCurrentFiscalYear();
    const historyStartDate = formatDateToISOString(getFiscalYearStartDate(currentFY - 2));

    let occupancyData = [];
    let statsError = null;
    let historyError = null;
    let stats = null;

    if (flexEmployeeId) {
        const [statsResult, historyResult] = await Promise.allSettled([
            getFlexOccupancyStatsAnchored(flexEmployeeId, formattedToday),
            getFlexOccupancyHistory(flexEmployeeId, formattedToday, historyStartDate),
        ]);

        if (statsResult.status === 'fulfilled') {
            stats = statsResult.value;
        } else {
            statsError =
                statsResult.reason?.message || statsResult.reason || 'Failed to load occupancy stats';
        }

        if (historyResult.status === 'fulfilled') {
            occupancyData = historyResult.value;
        } else {
            historyError =
                historyResult.reason?.message ||
                historyResult.reason ||
                'Failed to load occupancy history';
        }
    }

    return (
        <div className="flex flex-col">
            <div className="mb-6">
                <OccupancyStatsComponent stats={stats} error={statsError} />
            </div>
            <OccupancyListComponent
                occupancyData={occupancyData}
                flexEmployeeId={flexEmployeeId}
                formattedToday={formattedToday}
                historyStartDate={historyStartDate}
                error={historyError}
                statsRoute={OCCUPANCY_STATS_ROUTE}
            />
        </div>
    );
}
