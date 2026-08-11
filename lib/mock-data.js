// Helper function to generate a week of timecard data
function generateWeekTimecard(weekStartDate, weekEndDate, isComplete = true) {
    // Generate realistic hours (8 hours weekdays, 0 on weekends)
    const hours = [
        Math.random() > 0.1 ? 8 : 6, // Monday (10% chance of 6 hours)
        Math.random() > 0.1 ? 8 : 7, // Tuesday
        Math.random() > 0.1 ? 8 : 6, // Wednesday
        Math.random() > 0.1 ? 8 : 7, // Thursday
        Math.random() > 0.1 ? 8 : 6, // Friday
        0, // Saturday
        0, // Sunday
    ];

    // If week is not complete, set some days to 0
    if (!isComplete) {
        const currentDay = new Date().getDay();
        for (let i = currentDay; i < 7; i++) {
            hours[i] = 0;
        }
    }

    return {
        weekStartDate,
        weekEndDate,
        hours,
    };
}

// Generate timecards for the last 4 weeks
function generateAssignmentTimecards() {
    const timecards = [];
    const today = new Date();

    // Get Monday of current week
    const currentWeekMonday = new Date(today);
    currentWeekMonday.setDate(today.getDate() - today.getDay() + 1);

    // Generate last 4 weeks of data
    for (let i = 0; i < 20; i++) {
        const weekStart = new Date(currentWeekMonday);
        weekStart.setDate(weekStart.getDate() - i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // Current week is incomplete, past weeks are complete
        const isComplete = i > 0;
        timecards.unshift(
            generateWeekTimecard(
                weekStart.toISOString().split('T')[0],
                weekEnd.toISOString().split('T')[0],
                isComplete
            )
        );
    }

    return timecards;
}

// Sample assignment data with timecards
export const sampleAssignmentData = {
    id: 'a07Dn000002pUBBIA2',
    name: 'Senior Developer',
    projectName: 'Digital Transformation',
    projectStatus: 'Ongoing',
    startDate: '2024-02-01',
    endDate: '2024-06-30',
    projectedHours: 800,
    actualHours: 320,
    timecards: generateAssignmentTimecards(),
};

export const employeeData = {
    holidays: {
        totalHolidays: 30,
        currentFiscalUsedHolidays: 15,
        availableHolidays: 15,
        carriedOverHolidays: 0,
        balance: {
            earnedDays: 18,
            savedDays: 0,
            advanceDays: 12,
            totalDays: 30,
            availableDays: 15,
            usedDays: 15,
            isManual: true,
        },
        nextReset: '2025-04-01',
        recentHolidayPeriods: [
            { fromDate: '2025-02-15', toDate: '2025-02-20', days: 4 },
            { fromDate: '2025-01-02', toDate: '2025-01-05', days: 4 },
            { fromDate: '2025-12-27', toDate: '2025-12-29', days: 3 },
        ],
        allHolidaysRange: [
            '2025-07-15',
            '2025-07-16',
            '2025-07-17',
            '2025-07-18',
            '2025-07-19',
            '2025-07-20',
            '2025-08-02',
            '2025-08-03',
            '2025-08-04',
            '2025-08-05',
        ],
    },
    occupancy: {
        current: 85,
        history: [
            { month: 'January', rate: 90 },
            { month: 'February', rate: 85 },
            { month: 'March', rate: 85 },
        ],
    },
    usefulLinks: [
        {
            title: 'Pension Plans & Policies',
            description: 'Check your pension plan and policies',
            href: 'https://www.notion.so/deploy-consulting/Pension-Plans-Policy-71e54f641b104eeeb82915f8059c8481',
            icon: 'Wallet',
            target: '_blank',
        },
        {
            title: 'Insurance Policies',
            description: 'View and manage your insurance policies',
            href: 'https://www.notion.so/deploy-consulting/Insurance-Policies-6b66dea29d314304b178e78a9934e79a',
            icon: 'Shield',
            target: '_blank',
        },
        {
            title: 'Wellness',
            description: 'Access learning materials and courses',
            href: 'https://www.notion.so/deploy-consulting/Policy-Wellness-Friskv-rdsbidrag-222427198fd280bfaa02ccce51f52b92',
            icon: 'Leaf',
            target: '_blank',
        },
        {
            title: 'Flex',
            description: 'Access flex for time reporting',
            href: 'https://deploysweden.flexhosting.se/HRM/Home?f=b4253a61-f229-4ca9-9831-ad931d9a75a6',
            icon: 'Clock',
            target: '_blank',
        },
    ],
};

// Sample projects for time reporting
export const sampleProjects = [
    {
        flexId: '5da89f33-0e68-4855-8340-b30800fd8de0',
        name: 'Digital Transformation',
        client: 'Acme Corporation',
        status: 'active',
        color: '#3b82f6',
    },
    {
        flexId: 'proj-002',
        name: 'Cloud Migration',
        client: 'TechStart AB',
        status: 'active',
        color: '#10b981',
    },
    {
        flexId: 'proj-003',
        name: 'Platform Modernization',
        client: 'Nordic Finance',
        status: 'active',
        color: '#8b5cf6',
    },
    {
        flexId: 'proj-004',
        name: 'Data Analytics Dashboard',
        client: 'RetailMax',
        status: 'active',
        color: '#f59e0b',
    },
    {
        flexId: 'internal-001',
        name: 'Internal - Training',
        client: 'Deploy Consulting',
        status: 'active',
        color: '#6b7280',
    },
    {
        flexId: 'internal-002',
        name: 'Internal - Administration',
        client: 'Deploy Consulting',
        status: 'active',
        color: '#6b7280',
    },
];

// Sample time entries for the current and past weeks
export function generateSampleTimeEntries() {
    const entries = {};
    const today = new Date();

    // Get Monday of current week
    const currentWeekMonday = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekMonday.setDate(today.getDate() + diff);
    currentWeekMonday.setHours(0, 0, 0, 0);

    // Generate entries for the past 4 weeks
    for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
        const weekStart = new Date(currentWeekMonday);
        weekStart.setDate(weekStart.getDate() - weekOffset * 7);
        const weekKey = weekStart.toISOString().split('T')[0];

        entries[weekKey] = {
            '5da89f33-0e68-4855-8340-b30800fd8de0': [8, 8, 8, 8, 8, 0, 0],
            '5da89f33-0e68-4855-8340-b30800fd8de1': [0, 0, 0, 0, 0, 0, 0],
        };

        // Current week might have fewer hours logged
        if (weekOffset === 0) {
            const currentDayIndex = (today.getDay() + 6) % 7; // Monday = 0
            entries[weekKey] = {
                '5da89f33-0e68-4855-8340-b30800fd8de0': [8, 8, 4, 0, 0, 0, 0].map((h, i) =>
                    i <= currentDayIndex ? h : 0
                ),
                '5da89f33-0e68-4855-8340-b30800fd8de1': [0, 0, 4, 0, 0, 0, 0].map((h, i) =>
                    i <= currentDayIndex ? h : 0
                ),
            };
        }
    }

    return entries;
}

export const chartData = [
    { month: 'January 2024', date: '2024-01-01', occupancy: 86 },
    { month: 'February 2024', date: '2024-02-01', occupancy: 95 },
    { month: 'March 2024', date: '2024-03-01', occupancy: 87 },
    { month: 'April 2024', date: '2024-04-01', occupancy: 73 },
    { month: 'May 2024', date: '2024-05-01', occupancy: 89 },
    { month: 'June 2024', date: '2024-06-01', occupancy: 84 },
    { month: 'July 2024', date: '2024-07-01', occupancy: 85 },
    { month: 'August 2024', date: '2024-08-01', occupancy: 88 },
    { month: 'September 2024', date: '2024-09-01', occupancy: 92 },
    { month: 'October 2024', date: '2024-10-01', occupancy: 89 },
    { month: 'November 2024', date: '2024-11-01', occupancy: 87 },
    { month: 'December 2024', date: '2024-12-01', occupancy: 88 },
    { month: 'January 2025', date: '2025-01-01', occupancy: 86 },
    { month: 'February 2025', date: '2025-02-01', occupancy: 95 },
    { month: 'March 2025', date: '2025-03-01', occupancy: 87 },
    { month: 'April 2025', date: '2025-04-01', occupancy: 93 },
    { month: 'May 2025', date: '2025-05-01', occupancy: 89 },
    { month: 'June 2025', date: '2025-06-01', occupancy: 94 },
    { month: 'July 2025', date: '2025-07-01', occupancy: 127 },
    { month: 'August 2025', date: '2025-08-01', occupancy: 30 },
];
