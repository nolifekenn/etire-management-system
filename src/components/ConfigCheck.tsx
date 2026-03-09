"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface ConfigStatus {
  supabaseUrl: boolean;
  supabaseKey: boolean;
  databaseConnection: boolean;
  loading: boolean;
  error?: string;
}

export default function ConfigCheck() {
  const [status, setStatus] = useState<ConfigStatus>({
    supabaseUrl: false,
    supabaseKey: false,
    databaseConnection: false,
    loading: true
  });

  useEffect(() => {
    const checkConfiguration = async () => {
      const supabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      setStatus(prev => ({
        ...prev,
        supabaseUrl,
        supabaseKey,
        loading: false
      }));

      // Test database connection if credentials are available
      if (supabaseUrl && supabaseKey && supabase) {
        try {
          const { error } = await supabase.from('user').select('count').limit(1);
          setStatus(prev => ({
            ...prev,
            databaseConnection: !error,
            error: error?.message
          }));
        } catch (error: unknown) {
          setStatus(prev => ({
            ...prev,
            databaseConnection: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      }
    };

    checkConfiguration();
  }, []);

  if (status.loading) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Checking Configuration</AlertTitle>
        <AlertDescription>
          Verifying your environment setup...
        </AlertDescription>
      </Alert>
    );
  }

  const allGood = status.supabaseUrl && status.supabaseKey && status.databaseConnection;
  const hasCredentials = status.supabaseUrl && status.supabaseKey;

  if (allGood) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Configuration Complete</AlertTitle>
        <AlertDescription className="text-green-700">
          Your environment is properly configured and database connection is working.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Configuration Issues Detected</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          {!status.supabaseUrl && (
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span>Missing NEXT_PUBLIC_SUPABASE_URL</span>
            </div>
          )}
          {!status.supabaseKey && (
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span>Missing NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
            </div>
          )}
          {hasCredentials && !status.databaseConnection && (
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span>Database connection failed: {status.error}</span>
            </div>
          )}
          <div className="mt-4">
            <p className="font-semibold">To fix these issues:</p>
            <ol className="list-decimal list-inside space-y-1 mt-2 text-sm">
              <li>Create a <code className="bg-gray-100 px-1 rounded">.env.local</code> file in your project root</li>
              <li>Add your Supabase credentials (see SETUP_GUIDE.md)</li>
              <li>Restart your development server</li>
              <li>Ensure your database schema is set up correctly</li>
            </ol>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
