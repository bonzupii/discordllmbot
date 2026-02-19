export function sanitizeName(name: string | null | undefined): string {
    if (!name || typeof name !== 'string') {
        return 'unnamed';
    }

    const sanitized = name
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/^[\s.]+|[\s.]+$/g, '')
        .replace(/_+/g, '_')
        .substring(0, 200);

    if (!sanitized) {
        return 'unnamed';
    }

    return sanitized;
}
