"use server";

import { createAdminClient } from "@/lib/supabaseServer";

// Helper to generate dummy email
const getEmail = (username: string) => `${username}@etire-system.local`;

// -----------------------------------------------------------------------------
// REGISTER ACTION
// -----------------------------------------------------------------------------
export async function registerAction(formData: {
    firstName: string;
    lastName: string;
    username: string;
    password: string;
    email?: string; // Optional real email, but we use dummy for auth for consistency with username login
    phone?: string;
    address?: string;
}) {
    console.log("registerAction called with:", formData.username);
    const { firstName, lastName, username, password } = formData;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient: any = createAdminClient();
    const authEmail = getEmail(username);

    try {
        // 1. Check if username already exists in public.user
        console.log("Checking for existing user...");
        const { data: existingUser } = await adminClient
            .from("user")
            .select("username")
            .eq("username", username)
            .single();

        if (existingUser) {
            console.log("Username already taken.");
            return { success: false, message: "Username is already taken." };
        }

        // 2. Create Supabase Auth User
        console.log("Creating Supabase Auth user...");
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email: authEmail,
            password: password,
            email_confirm: true,
            user_metadata: {
                name: `${firstName} ${lastName}`,
                username: username
            }
        });

        if (authError) {
            console.error("Registration Auth Error:", authError.message);
            return { success: false, message: `Registration failed: ${authError.message}` };
        }

        if (!authData.user) {
            console.error("Failed to create user account (no user data).");
            return { success: false, message: "Failed to create user account." };
        }

        // 3. Insert into public.user linked with uuid
        console.log("Inserting into public.user...");
        const { error: dbError } = await adminClient
            .from("user")
            .insert({
                name: `${firstName} ${lastName}`,
                username: username,
                password: password, // Keeping legacy password for now as per requirement, or we could store a placeholder
                role: 0, // Default to Guest
                uuid: authData.user.id
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

        if (dbError) {
            console.error("Registration DB Error:", dbError.message);
            // Should delete auth user if db insert fails to maintain consistency
            await adminClient.auth.admin.deleteUser(authData.user.id);
            return { success: false, message: `Database error: ${dbError.message}` };
        }

        console.log("Registration successful!");
        return { success: true };

    } catch (error) {
        console.error("Server Error in registerAction:", error);
        return { success: false, message: "An unexpected error occurred." };
    }
}
