/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    getFormState,
    clearFormState,
    clearAllFormStates
} from '@/lib/formPersistence';
import { Trash2, Save, Clock } from 'lucide-react';

interface FormPersistenceIndicatorProps {
    formId: string;
    onClear?: () => void;
    showClearButton?: boolean;
}

export function FormPersistenceIndicator({
    formId,
    onClear,
    showClearButton = true
}: FormPersistenceIndicatorProps) {
    const [hasSavedData, setHasSavedData] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    useEffect(() => {
        const checkSavedData = () => {
            const savedData = getFormState(formId);
            if (savedData) {
                setHasSavedData(true);
                // Try to get timestamp from saved data
                const timestamp = savedData._timestamp;
                if (timestamp) {
                    setLastSaved(new Date(timestamp as string | number | Date));
                }
            } else {
                setHasSavedData(false);
                setLastSaved(null);
            }
        };

        checkSavedData();

        // Check for saved data every 5 seconds
        const interval = setInterval(checkSavedData, 5000);
        return () => clearInterval(interval);
    }, [formId]);

    const handleClear = () => {
        clearFormState(formId);
        setHasSavedData(false);
        setLastSaved(null);
        if (onClear) {
            onClear();
        }
    };

    const _handleClearAll = () => {
        clearAllFormStates();
        setHasSavedData(false);
        setLastSaved(null);
        if (onClear) {
            onClear();
        }
    };

    if (!hasSavedData) {
        return null;
    }

    return (
        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <Save className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
                Form data saved automatically
            </span>
            {lastSaved && (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                    <Clock className="h-3 w-3" />
                    {lastSaved.toLocaleTimeString()}
                </div>
            )}
            {showClearButton && (
                <div className="flex gap-1 ml-auto">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClear}
                        className="h-6 px-2 text-xs"
                    >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                    </Button>
                </div>
            )}
        </div>
    );
}

// Component to show all saved forms
export function SavedFormsManager() {
    const [savedForms, setSavedForms] = useState<string[]>([]);

    useEffect(() => {
        const checkSavedForms = () => {
            const keys = Object.keys(localStorage);
            const formKeys = keys.filter(key => key.startsWith('etire_form_'));
            setSavedForms(formKeys.map(key => key.replace('etire_form_', '')));
        };

        checkSavedForms();
        const interval = setInterval(checkSavedForms, 5000);
        return () => clearInterval(interval);
    }, []);

    if (savedForms.length === 0) {
        return null;
    }

    return (
        <div className="p-4 bg-gray-50 border rounded-md">
            <h4 className="font-medium mb-2">Saved Forms</h4>
            <div className="space-y-2">
                {savedForms.map(formId => (
                    <div key={formId} className="flex items-center justify-between p-2 bg-white border rounded">
                        <span className="text-sm">{formId}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearFormState(formId)}
                            className="h-6 px-2 text-xs"
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFormStates}
                    className="w-full mt-2"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Saved Forms
                </Button>
            </div>
        </div>
    );
}
