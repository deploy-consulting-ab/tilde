'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { DynamicBreadcrumbComponent } from '@/components/application/breadcrumb/dynamic-breadcrumb';
import { ModeToggleComponent } from '@/components/application/mode-toggle';
import { LogoutButtonComponent } from '@/components/application/logout-button';
import { GlobalSearch } from '@/components/application/search/global-search';
import { SetupButtonComponent } from '@/components/application/setup-button';
import { MobileBackButtonComponent } from '@/components/application/mobile-back-button';
import { cn } from '@/lib/utils';

const SEARCH_WIDTH_PX = 400;
const TRIGGER_WIDTH_PX = 32;
const HEADER_GAP_PX = 16;

export function AppHeaderBar({ user, location, showSetup }) {
    const headerRef = useRef(null);
    const iconsRef = useRef(null);
    const breadcrumbWidthRef = useRef(0);
    const [searchOnRight, setSearchOnRight] = useState(false);
    const [centeredBreadcrumbMaxWidth, setCenteredBreadcrumbMaxWidth] = useState(null);
    const [expandedBreadcrumbMaxWidth, setExpandedBreadcrumbMaxWidth] = useState(null);

    const updateSearchPlacement = useCallback(() => {
        const header = headerRef.current;
        if (!header) return;

        const isBreadcrumbVisible = window.matchMedia('(min-width: 768px)').matches;
        if (!isBreadcrumbVisible) {
            setSearchOnRight(false);
            return;
        }

        const headerWidth = header.clientWidth;
        const iconsWidth = iconsRef.current?.offsetWidth ?? 0;
        const centeredBudget = Math.max(
            0,
            headerWidth / 2 - SEARCH_WIDTH_PX / 2 - TRIGGER_WIDTH_PX - HEADER_GAP_PX * 3
        );
        const expandedBudget = Math.max(
            0,
            headerWidth - SEARCH_WIDTH_PX - iconsWidth - TRIGGER_WIDTH_PX - HEADER_GAP_PX * 4
        );

        setCenteredBreadcrumbMaxWidth(centeredBudget);
        setExpandedBreadcrumbMaxWidth(expandedBudget);
        setSearchOnRight(breadcrumbWidthRef.current > centeredBudget);
    }, []);

    const handleBreadcrumbWidthChange = useCallback(
        (width) => {
            breadcrumbWidthRef.current = width;
            updateSearchPlacement();
        },
        [updateSearchPlacement]
    );

    useLayoutEffect(() => {
        const header = headerRef.current;
        if (!header) return undefined;

        updateSearchPlacement();

        const resizeObserver = new ResizeObserver(updateSearchPlacement);
        resizeObserver.observe(header);
        if (iconsRef.current) {
            resizeObserver.observe(iconsRef.current);
        }

        return () => resizeObserver.disconnect();
    }, [updateSearchPlacement, showSetup]);

    const search = (
        <div className="w-full max-w-xl md:max-w-none md:w-[400px]">
            <GlobalSearch user={user} location={location} />
        </div>
    );

    return (
        <header
            ref={headerRef}
            className={cn(
                'bg-sidebar sticky top-0 z-50 grid h-16 w-full max-w-full shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 px-4 md:overflow-visible md:flex md:grid-cols-none',
                searchOnRight ? 'md:gap-4' : 'md:relative md:gap-4'
            )}
        >
            <div className="relative z-10 flex min-w-fit shrink-0 items-center gap-1 md:gap-4">
                <MobileBackButtonComponent className="md:hidden" />
                <SidebarTrigger className="-ml-1 shrink-0 rounded-lg transition-colors hover:bg-accent/50 hover:cursor-pointer" />
                <div className="hidden min-w-0 overflow-hidden md:block">
                    <DynamicBreadcrumbComponent
                        maxContainerWidth={
                            searchOnRight ? expandedBreadcrumbMaxWidth : centeredBreadcrumbMaxWidth
                        }
                        onContentWidthChange={handleBreadcrumbWidthChange}
                    />
                </div>
            </div>

            <div
                className={cn(
                    'flex min-w-0 justify-center',
                    searchOnRight
                        ? 'md:relative md:z-20 md:shrink-0 md:px-0'
                        : 'md:pointer-events-none md:absolute md:left-1/2 md:top-1/2 md:z-20 md:-translate-x-1/2 md:-translate-y-1/2 md:px-0'
                )}
            >
                <div className="pointer-events-auto w-full">{search}</div>
            </div>

            {searchOnRight && <div className="hidden min-w-0 flex-1 md:block" aria-hidden="true" />}

            <div
                ref={iconsRef}
                className={cn(
                    'relative z-10 flex shrink-0 items-center justify-self-end gap-2 md:justify-self-auto',
                    !searchOnRight && 'md:ml-auto'
                )}
            >
                {showSetup && <SetupButtonComponent />}
                <ModeToggleComponent />
                <LogoutButtonComponent className="hidden md:inline-flex" />
            </div>
        </header>
    );
}
