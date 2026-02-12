
"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page is now the root of the protected app section.
// It just redirects to the dashboard.
export default function AppPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard');
    }, [router]);

    return null; // or a loading spinner
}
