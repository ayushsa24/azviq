import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
}

export interface ApiErrorResponse {
    success: false;
    error: {
        message: string;
        code?: string;
        details?: unknown;
    };
}

/**
 * Standardized success response wrapper
 */
export function apiSuccess<T>(data: T, status = 200) {
    return NextResponse.json<ApiSuccessResponse<T>>(
        { success: true, data },
        { status }
    );
}

/**
 * Standardized error response wrapper
 */
export function apiError(
    message: string,
    status = 500,
    code?: string,
    details?: unknown
) {
    // Log unexpected 500 errors to the server console
    if (status >= 500) {
        console.error(`[API Error - ${status}]: ${message}`, details || '');
    }

    return NextResponse.json<ApiErrorResponse>(
        {
            success: false,
            error: {
                message,
                ...(code ? { code } : {}),
                ...(details ? { details } : {}),
            },
        },
        { status }
    );
}

/**
 * Helper to wrap external API calls (OpenAI, Gemini, etc.)
 * Catches timeouts and external failures gracefully.
 */
export async function withErrorHandling<T>(
    operation: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiErrorResponse>> {
    try {
        return await operation();
    } catch (error: unknown) {
        // Handle Zod Validation Errors
        if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'ZodError') {
             return apiError('Validation Error', 400, 'ZOD_VALIDATION_ERROR', (error as Record<string, unknown>).errors);
        }
        
        // Handle common structured errors
        const err = error as Record<string, unknown>;
        const message = typeof err?.message === 'string' ? err.message : 'An unexpected error occurred';
        const status = typeof err?.status === 'number' ? err.status : (typeof err?.statusCode === 'number' ? err.statusCode : 500);
        
        return apiError(message, status, 'INTERNAL_SERVER_ERROR', process.env.NODE_ENV === 'development' ? error : undefined);
    }
}
