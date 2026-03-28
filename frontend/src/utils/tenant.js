/**
 * Helper to identify the current tenant from the subdomain.
 * For example: 'sandton.dealeros.co.za' -> 'sandton'
 */
export const getSubdomain = () => {
    const hostname = window.location.hostname;

    // Handle localhost for testing
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'local-dealership'; // Mock for local dev
    }

    const parts = hostname.split('.');
    if (parts.length > 2) {
        return parts[0];
    }

    return null;
};

export const getTenantInfo = async () => {
    // In a real app, we'd fetch branding/config from our API
    // based on the subdomain
    const subdomain = getSubdomain();

    return {
        subdomain,
        name: subdomain ? subdomain.charAt(0).toUpperCase() + subdomain.slice(1) : 'KenganAuto',
        branding: {
            primary: '#151D2A',
            accent: '#F97316',
            logo: null
        }
    };
};
