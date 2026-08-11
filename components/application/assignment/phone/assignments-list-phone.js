'use client';

import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AssignmentCardPhoneComponent } from '@/components/application/assignment/phone/assignment-card-phone';
import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ErrorDisplayComponent } from '@/components/errors/error-display';
import { useInfiniteScrollSentinel } from '@/hooks/use-infinite-scroll-sentinel';

export function AssignmentsListPhoneComponent({
    assignments,
    error,
    projectViews,
    assignmentRoute,
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [view, setView] = useState(searchParams.get('view') || 'all');
    const [displayCount, setDisplayCount] = useState(2); // Initial items to show

    const loadMore = useCallback(() => {
        setDisplayCount((prev) => prev + 10);
    }, []);

    const handleFilterAssignment = (value) => {
        setView(value);
        setDisplayCount(10); // Reset display count when filter changes
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setDisplayCount(10); // Reset display count when search changes
    };

    const handleAssignmentClick = (id) => {
        router.push(`${assignmentRoute}/${id}`);
    };

    // Filter assignments based on search and view
    const filteredAssignments = () => {
        return (
            assignments?.filter(
                (assignment) =>
                    (view === 'all' ||
                        assignment.projectStatus.toLowerCase() === view.toLowerCase()) &&
                    (searchQuery === '' ||
                        assignment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        assignment.projectName.toLowerCase().includes(searchQuery.toLowerCase()))
            ) || []
        );
    };

    const filtered = filteredAssignments();
    const displayedAssignments = filtered.slice(0, displayCount);
    const hasMore = displayCount < filtered.length;
    const sentinelRef = useInfiniteScrollSentinel(hasMore, loadMore);

    if (error) {
        return <ErrorDisplayComponent error={error} />;
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Input
                    placeholder="Search assignments..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full text-sm"
                />
                <Select value={view} onValueChange={handleFilterAssignment} key="view-by-projects">
                    <SelectTrigger className="w-full hover:cursor-pointer">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        {projectViews.map((view) => (
                            <SelectItem key={view.value} value={view.value}>
                                {view.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-4">
                {displayedAssignments.map((assignment) => (
                    <AssignmentCardPhoneComponent
                        key={assignment.id}
                        assignment={assignment}
                        onClick={handleAssignmentClick}
                    />
                ))}
                {filtered.length === 0 && (
                    <div className="text-center py-8 text-gray-500">No assignments found</div>
                )}
            </div>
            {/* Sentinel element for intersection observer */}
            {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-4">
                    <div className="text-sm text-gray-500">Loading more...</div>
                </div>
            )}
            {!hasMore && filtered.length > 0 && (
                <div className="text-center py-4 text-sm text-gray-500">All assignments loaded</div>
            )}
        </div>
    );
}
