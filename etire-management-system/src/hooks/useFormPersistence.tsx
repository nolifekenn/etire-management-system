"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
    saveFormState, 
    getFormState, 
    clearFormState 
} from '@/lib/tokenAuth';

interface UseFormPersistenceOptions {
    formId: string;
    autoSave?: boolean;
    saveInterval?: number; // in milliseconds
    onRestore?: (data: Record<string, any>) => void;
}

export function useFormPersistence({
    formId,
    autoSave = true,
    saveInterval = 2000, // 2 seconds
    onRestore
}: UseFormPersistenceOptions) {
    const [isRestored, setIsRestored] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Restore form state on mount
    useEffect(() => {
        const savedData = getFormState(formId);
        if (savedData && onRestore) {
            onRestore(savedData);
            setIsRestored(true);
        }
    }, [formId, onRestore]);

    // Auto-save function
    const saveData = useCallback((data: Record<string, any>) => {
        try {
            saveFormState(formId, data);
            setLastSaved(new Date());
        } catch (error) {
            console.error('Failed to save form state:', error);
        }
    }, [formId]);

    // Auto-save effect
    useEffect(() => {
        if (!autoSave) return;

        const interval = setInterval(() => {
            // This will be called by the form component
        }, saveInterval);

        return () => clearInterval(interval);
    }, [autoSave, saveInterval]);

    // Clear form state
    const clearData = useCallback(() => {
        try {
            clearFormState(formId);
            setLastSaved(null);
        } catch (error) {
            console.error('Failed to clear form state:', error);
        }
    }, [formId]);

    // Get saved data
    const getSavedData = useCallback(() => {
        return getFormState(formId);
    }, [formId]);

    return {
        saveData,
        clearData,
        getSavedData,
        isRestored,
        lastSaved
    };
}

// Hook for specific form fields
export function useFormFieldPersistence(
    formId: string,
    fieldName: string,
    initialValue: any = ''
) {
    const [value, setValue] = useState(initialValue);
    const [isRestored, setIsRestored] = useState(false);

    // Restore field value on mount
    useEffect(() => {
        const savedData = getFormState(formId);
        if (savedData && savedData[fieldName] !== undefined) {
            setValue(savedData[fieldName]);
            setIsRestored(true);
        }
    }, [formId, fieldName]);

    // Save field value when it changes
    const updateValue = useCallback((newValue: any) => {
        setValue(newValue);
        
        // Get current form data and update the specific field
        const currentData = getFormState(formId) || {};
        const updatedData = { ...currentData, [fieldName]: newValue };
        saveFormState(formId, updatedData);
    }, [formId, fieldName]);

    return {
        value,
        setValue: updateValue,
        isRestored
    };
}

// Hook for form submission with persistence
export function useFormSubmission(formId: string) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submitForm = useCallback(async (
        formData: Record<string, any>,
        onSubmit: (data: Record<string, any>) => Promise<void>
    ) => {
        setIsSubmitting(true);
        try {
            await onSubmit(formData);
            // Clear form state on successful submission
            clearFormState(formId);
        } catch (error) {
            console.error('Form submission error:', error);
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    }, [formId]);

    return {
        submitForm,
        isSubmitting
    };
}
