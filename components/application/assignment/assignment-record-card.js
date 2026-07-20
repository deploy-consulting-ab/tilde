'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateToSwedish, getAssignmentStageColor, formatCurrency } from '@/lib/utils';
import { ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { ErrorDisplayComponent } from '@/components/errors/error-display';
import { NoDataComponent } from '@/components/errors/no-data';
import { AssignmentTimecardsDatatable } from '@/components/application/assignment/assignment-timecards-datatable';

export function AssignmentRecordCardComponent({
    assignment,
    timecardHours,
    actualHours,
    error,
    timecardsRoute,
}) {
    const isMobile = useIsMobile();

    if (!assignment) {
        return <NoDataComponent text="Assignment not found" />;
    }

    if (error) {
        return <ErrorDisplayComponent error={error} />;
    }

    const {
        name,
        startDate,
        endDate,
        projectStatus,
        projectName,
        projectedHours,
        actualAmount,
        actualCost,
        actualProfitability,
        actualProfitabilityPercentage,
        currencyIsoCode,
    } = assignment;

    return (
        <>
            <Card className="w-full transition-all hover:shadow-md border-l-4 border-l-deploy-blue">
                <CardHeader className="space-y-1 border-b">
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className={`${isMobile ? 'text-sm' : 'text-2xl'}`}>
                                {projectName}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">{name}</p>
                        </div>
                        <Badge
                            className={`${getAssignmentStageColor(projectStatus)} text-white`}
                            variant="outline"
                        >
                            <span className="uppercase">{projectStatus}</span>
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                            <p className="text-muted-foreground font-semibold text-xs uppercase">
                                Start Date
                            </p>
                            <p className="font-medium">{formatDateToSwedish(startDate)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground font-semibold text-xs uppercase">
                                End Date
                            </p>
                            <p className="font-medium">{formatDateToSwedish(endDate)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground font-semibold text-xs uppercase">
                                Projected Hours
                            </p>
                            <p className="font-medium">{projectedHours} hours</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground font-semibold text-xs uppercase">
                                Actual Hours
                            </p>
                            <p className="font-medium">{actualHours} hours</p>
                        </div>
                        {actualAmount != null && (
                            <div className="space-y-1">
                                <p className="text-muted-foreground font-semibold text-xs uppercase">
                                    Actual Amount
                                </p>
                                <p className="font-medium">
                                    {formatCurrency(actualAmount, currencyIsoCode)}
                                </p>
                            </div>
                        )}
                        {actualCost != null && (
                            <div className="space-y-1">
                                <p className="text-muted-foreground font-semibold text-xs uppercase">
                                    Actual Cost
                                </p>
                                <p className="font-medium">
                                    {formatCurrency(actualCost, currencyIsoCode)}
                                </p>
                            </div>
                        )}
                        {actualProfitability != null && (
                            <div className="space-y-1">
                                <p className="text-muted-foreground font-semibold text-xs uppercase">
                                    Actual Profitability
                                </p>
                                <p className="font-medium">
                                    {formatCurrency(actualProfitability, currencyIsoCode)}
                                </p>
                            </div>
                        )}
                        {actualProfitabilityPercentage != null && (
                            <div className="space-y-1">
                                <p className="text-muted-foreground font-semibold text-xs uppercase">
                                    Actual Profitability %
                                </p>
                                <p className="font-medium">
                                    {actualProfitabilityPercentage.toFixed(1)}%
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Link to Timecards */}
                    {actualHours > 0 && (
                        <Link
                            href={`${timecardsRoute}/${assignment.id}/timecards`}
                            className="block w-full"
                        >
                            <Card className="transition-colors hover:bg-muted/50">
                                <CardContent className="flex items-center justify-between p-4">
                                    <div className="flex items-center space-x-2">
                                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                        <span>View Time Reports</span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                        {actualHours} hours logged
                                    </span>
                                </CardContent>
                            </Card>
                        </Link>
                    )}
                </CardContent>
            </Card>

            {/* Timecards Datatable */}
            <div className="mt-4">
                <AssignmentTimecardsDatatable
                    timecardHours={timecardHours}
                    timecardsRoute={timecardsRoute}
                    assignmentId={assignment.id}
                />
            </div>
        </>
    );
}
