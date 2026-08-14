import { Card, CardContent } from '@/components/ui/card';
import { formatSEK } from '@/lib/utils';
import { FinancialMetricCell } from '@/components/application/management/financials/financial-yoy-badge';
import { formatFinancialQuarterLabel } from '@/components/application/management/financials/financials-constants';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';

export function FinancialCardPhoneComponent({
    record,
    canManage,
    openEditDialog,
    handleDelete,
}) {
    const quarterLabel = formatFinancialQuarterLabel(record);
    const yoy = record._yoy;

    const renderMetric = (key, invertColors = false) => {
        if (yoy) {
            return (
                <FinancialMetricCell
                    value={record[key]}
                    yoyPercent={yoy[key]}
                    invertColors={invertColors}
                />
            );
        }
        return <p className="font-medium tabular-nums text-sm">{formatSEK(record[key])}</p>;
    };

    return (
        <Card key={record.id} className={record._isComputed ? 'bg-muted/80 dark:bg-muted' : ''}>
            <CardContent>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                            FY{String(record.fiscalYear).slice(-2)}
                        </span>
                        <span className="text-muted-foreground text-sm">—</span>
                        <span className="text-sm">{quarterLabel}</span>
                        {record._isComputed && (
                            <span className="text-xs text-muted-foreground">(computed)</span>
                        )}
                    </div>
                    {canManage && !record._isComputed && !record._isAggregated && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0 opacity-50 hover:opacity-100 hover:cursor-pointer"
                                >
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(record)}>
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => handleDelete(record.id)}
                                >
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Revenue
                        </p>
                        {renderMetric('revenue')}
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Cost
                        </p>
                        {renderMetric('cost', true)}
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Profit
                        </p>
                        {renderMetric('profit')}
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Taxes
                        </p>
                        {renderMetric('taxes', true)}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
