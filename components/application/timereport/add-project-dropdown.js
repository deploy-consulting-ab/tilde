'use client';

import { Plus } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

/**
 * Reusable dropdown for adding projects.
 * Shows available projects that aren't already selected.
 */
export function AddProjectDropdownComponent({
    projects,
    selectedProjects,
    onAddProject,
    variant = 'default',
}) {
    const availableProjects = projects.filter((p) => !selectedProjects.has(p.flexId));

    if (availableProjects.length === 0) {
        return null;
    }

    const handleProjectSelect = (projectId) => {
        if (projectId && !selectedProjects.has(projectId)) {
            onAddProject(projectId);
        }
    };

    return (
        <Select value="" onValueChange={handleProjectSelect}>
            <SelectTrigger
                className={
                    variant === 'compact'
                        ? 'w-full sm:w-auto gap-2 border-dashed hover:cursor-pointer'
                        : 'w-full sm:w-50'
                }
            >
                {variant === 'compact' && <Plus className="h-4 w-4" />}
                <SelectValue placeholder="Add project" />
            </SelectTrigger>
            <SelectContent>
                {availableProjects.map((project) => (
                    <SelectItem
                        key={project.flexId}
                        value={project.flexId}
                        className="hover:cursor-pointer"
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: project.color }}
                            />
                            <span className="truncate">{project.name}</span>
                            <span className="text-muted-foreground text-xs hidden sm:inline">
                                {project.client}
                            </span>
                            <span className="text-muted-foreground text-xs hidden sm:inline">
                                ({project.projectCode})
                            </span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
