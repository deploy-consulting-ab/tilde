import { getCurrentFiscalYear, getPreviousFiscalYear } from '@/lib/utils';
import { OccupancyStatCard } from '@/components/application/occupancy/occupancy-stat-card';
import { ErrorDisplayComponent } from '@/components/errors/error-display';

export async function OccupancyStatsComponent({ stats, error }) {
    if (error) {
        return <ErrorDisplayComponent error={error} />;
    }

    if (!stats) {
        return null;
    }

    const currentFY = getCurrentFiscalYear();
    const previousFY = getPreviousFiscalYear();

    return (
        <div className="flex flex-col">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                <OccupancyStatCard
                    title="Current Occupancy Rate"
                    rate={stats.current}
                    subtitle={stats.currentMonth ?? 'Most recent month'}
                />
                <OccupancyStatCard
                    title={`FY ${currentFY} YTD Occupancy Rate`}
                    rate={stats.currentFYTD}
                    subtitle={`Feb ${currentFY} – today`}
                    monthCount={stats.currentFYMonthCount}
                />
                <OccupancyStatCard
                    title={`FY ${previousFY} Occupancy Rate`}
                    rate={stats.lastFY}
                    subtitle={`Feb ${previousFY} – Jan ${previousFY + 1}`}
                    monthCount={stats.lastFYMonthCount}
                />
            </div>
        </div>
    );
}
