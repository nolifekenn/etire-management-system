// /lib/formPersistence.ts

export const FORM_STATE_PREFIX = "etire_form_";

// ============================
// 🧾 FORM STATE MANAGEMENT
// ============================

export interface FormState {
    formId: string;
    data: Record<string, any>;
    timestamp: number;
}

// Save form state for recovery
export function saveFormState(formId: string, data: Record<string, any>): void {
    try {
        const formState: FormState = {
            formId,
            data,
            timestamp: Date.now(),
        };
        localStorage.setItem(`${FORM_STATE_PREFIX}${formId}`, JSON.stringify(formState));
    } catch (error) {
        console.error("Failed to save form state:", error);
    }
}

// Retrieve a saved form state
export function getFormState(formId: string): Record<string, any> | null {
    try {
        const formState = localStorage.getItem(`${FORM_STATE_PREFIX}${formId}`);
        if (!formState) return null;

        const parsed = JSON.parse(formState) as FormState;

        // Expire after 24 hours
        const maxAge = 24 * 60 * 60 * 1000;
        if (Date.now() - parsed.timestamp > maxAge) {
            clearFormState(formId);
            return null;
        }

        return parsed.data;
    } catch (error) {
        console.error("Failed to get form state:", error);
        return null;
    }
}

export function clearFormState(formId: string): void {
    try {
        localStorage.removeItem(`${FORM_STATE_PREFIX}${formId}`);
    } catch (error) {
        console.error("Failed to clear form state:", error);
    }
}

export function clearAllFormStates(): void {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
            if (key.startsWith(FORM_STATE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.error("Failed to clear form states:", error);
    }
}
