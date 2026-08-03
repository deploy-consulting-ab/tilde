import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorDisplayComponent } from '@/components/errors/error-display';
import { EmployeeFinancialMetrics } from '@/components/application/management/employees/employee-financial-metrics';
import {
    BreakEvenBadge,
    EMPLOYEE_FINANCIAL_TOOLTIPS,
    ProfitBadge,
} from '@/components/application/management/employees/employee-financial-metric-ui';

export async function EmployeeFinancialCardComponent({ employee, fyAmounts, error }) {
    if (error) {
        return <ErrorDisplayComponent error={error} />;
    }

    const { adjustedCostFY, adjustedCostFYTD } = employee;
    const projectedAmountFY = fyAmounts?.projectedAmountFY ?? null;
    const invoicedAmount = fyAmounts?.actualAmount ?? null;

    const projectedProfitabilityFY =
        projectedAmountFY != null && adjustedCostFY != null
            ? projectedAmountFY - adjustedCostFY
            : null;
    const profitabilityFY =
        invoicedAmount != null && adjustedCostFY != null ? invoicedAmount - adjustedCostFY : null;
    const profitabilityFYTD =
        invoicedAmount != null && adjustedCostFYTD != null
            ? invoicedAmount - adjustedCostFYTD
            : null;

    const isProfitableFYTD = profitabilityFYTD != null && profitabilityFYTD >= 0;
    const hasBreakEvenFY = profitabilityFY != null && profitabilityFY > 0;

    return (
        <Card
            className={`w-full transition-all hover:shadow-md border-l-4 ${
                isProfitableFYTD ? 'border-l-deploy-blue' : 'border-l-deploy-accent-orange'
            }`}
        >
            <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 min-w-0">
                        <CardTitle className="text-base">Financial Overview</CardTitle>
                        {hasBreakEvenFY && (
                            <BreakEvenBadge description={EMPLOYEE_FINANCIAL_TOOLTIPS.breakEvenFY} />
                        )}
                    </div>
                    <ProfitBadge
                        value={profitabilityFYTD}
                        description={EMPLOYEE_FINANCIAL_TOOLTIPS.profitabilityFYTD}
                    />
                </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
                <EmployeeFinancialMetrics
                    adjustedCostFY={adjustedCostFY}
                    adjustedCostFYTD={adjustedCostFYTD}
                    projectedAmountFY={projectedAmountFY}
                    invoicedAmount={invoicedAmount}
                    projectedProfitabilityFY={projectedProfitabilityFY}
                    profitabilityFY={profitabilityFY}
                    profitabilityFYTD={profitabilityFYTD}
                />
            </CardContent>
        </Card>
    );
}
