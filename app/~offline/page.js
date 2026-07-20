'use client';

import { Button } from '@/components/ui/button';

export default function OfflinePage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center space-y-6 px-4 max-w-md">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold">You&apos;re Offline</h1>
                    <p className="text-muted-foreground text-lg">
                        Please check your internet connection and try again.
                    </p>
                </div>
                <Button
                    onClick={() => {
                        window.location.reload();
                    }}
                    size="lg"
                    className="hover:cursor-pointer"
                >
                    Retry Connection
                </Button>
            </div>
        </div>
    );
}
