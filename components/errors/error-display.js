import { AlertCircle, WifiOff, Search, AlertTriangle } from 'lucide-react';
import { STATUS_CODES } from '@/actions/callouts/config';

export function ErrorDisplayComponent({ error }) {
    // Default error state
    let title = 'An error occurred';
    let message = 'Please try again later';
    let icon = AlertCircle;
    let variant = 'error'; // error, warning, info

    // Handle string errors from server components (Errors are not RSC-serializable)
    if (typeof error === 'string') {
        title = 'Error';
        message = error;
    } else if (error instanceof Error) {
        switch (error.name) {
            case 'Error':
                title = 'Error';
                message = error.message;
                icon = AlertCircle;
                variant = 'error';
                break;
            case 'NetworkError':
                title = 'Connection Error';
                message =
                    error.message ||
                    'Unable to connect to the server. Please check your internet connection.';
                icon = WifiOff;
                break;
            case 'NoResultsError':
                title = 'No Results Found';
                message = "We couldn't find the information you're looking for.";
                icon = Search;
                variant = 'warning';
                break;
            case 'ApiError':
                title = 'Service Error';
                message = error.message || 'There was a problem with the service.';
                if (
                    error.status === STATUS_CODES.UNAUTHORIZED ||
                    error.status === STATUS_CODES.FORBIDDEN
                ) {
                    message = "You don't have permission to access this resource.";
                } else if (error.status === STATUS_CODES.NOT_FOUND) {
                    message = 'The requested resource was not found.';
                }
                break;
            case 'ValidationError':
                title = 'Invalid Input';
                message = error.message || 'Please check your input and try again.';
                icon = AlertTriangle;
                variant = 'warning';
                break;
            case 'PrismaClientValidationError':
                title = error.name;
                message = error.message;
                break;
            case 'PrismaClientInitializationError':
                title = error.name;
                message = error.message;
                break;
        }
    }

    const variantStyles = {
        error: 'bg-red-50 text-red-700 border-red-200',
        warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        info: 'bg-blue-50 text-blue-700 border-blue-200',
    };

    const IconComponent = icon;

    return (
        <div
            className={`p-4 rounded-lg border ${variantStyles[variant]} flex items-start gap-3 break-words`}
        >
            <IconComponent className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
                <h3 className="font-semibold mb-1 break-words">{title}</h3>
                <p className="text-sm opacity-90 break-words whitespace-pre-wrap">{message}</p>
            </div>
        </div>
    );
}
