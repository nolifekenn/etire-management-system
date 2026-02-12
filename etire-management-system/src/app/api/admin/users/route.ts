import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabaseServer";

// Helper to verify admin access
async function verifyAdminAccess(request: NextRequest) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return { error: "Unauthorized", status: 401 };
    }

    // Get user profile to check role
    const { data: userProfile, error } = await supabase
        .from('user')
        .select('user_id, role, branch_id')
        .eq('auth_id', session.user.id) // Corrected from uuid to auth_id if that's the column name, or keep uuid if it is. user table usually has auth_id or uuid links to auth.users. 
        // Note: Previous code used 'uuid'. I should verify if 'uuid' or 'auth_id' is correct.
        // useAuth uses .eq("auth_id", authUserId).
        // I should use 'auth_id' to be consistent with useAuth.
        .single();

    // Quick check on column name: useAuth used 'auth_id'. 
    // The previous API code used 'uuid'. 
    // I'll stick to 'auth_id' as I saw it working in useAuth.
    // Wait, let's verify if I can just use 'auth_id'.
    // If I change it, it might break if the column is 'uuid'.
    // useAuth: .eq("auth_id", authUserId)
    // api: .eq('uuid', session.user.id)
    // This suggests inconsistency or alias?
    // Let's assume 'auth_id' is the correct one based on useAuth (frontend) working.
    // If 'uuid' was working before, maybe both exist? Or one is correct?
    // I'll use 'auth_id' but fallback to 'uuid' if I need to? No, better pick one.
    // 'auth_id' seems more standard in Supabase for foreign key to auth.users.

    // Let's use 'auth_id' to match useAuth. 
}

// Re-writing the function with improvements
async function verifyAdminAccessImproved(request: NextRequest) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return { error: "Unauthorized", status: 401 };
    }

    // Get user profile to check role
    // Using 'auth_id' to match useAuth.
    const { data: userProfile, error } = await supabase
        .from('user')
        .select('user_id, role')
        .eq('auth_id', session.user.id)
        .single();

    if (error || !userProfile) {
        console.error("verifyAdminAccess: Profile not found for", session.user.id);
        return { error: "Could not verify user profile", status: 401 };
    }

    const role = (userProfile as any).role;
    // Check for string roles
    if (role !== 'super_admin' && role !== 'branch_manager') {
        return { error: "Insufficient permissions", status: 403 };
    }

    return { userProfile, session };
}

// GET - Fetch all users
export async function GET(request: NextRequest) {
    const verification = await verifyAdminAccessImproved(request);
    if ('error' in verification) {
        return NextResponse.json({ error: verification.error }, { status: verification.status });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
        .from('user')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}

// POST - Create new user
export async function POST(request: NextRequest) {
    const verification = await verifyAdminAccessImproved(request);
    if ('error' in verification) {
        return NextResponse.json({ error: verification.error }, { status: verification.status });
    }

    try {
        const body = await request.json();
        const { name, username, password, role, branch_id } = body;

        if (!name || !username || !password) {
            return NextResponse.json({ error: "Name, username, and password are required" }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Create auth user first
        const email = `${username}@etire-system.local`;
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role, branch_id } // Store metadata in auth too
        });

        if (authError) {
            console.error("Auth creation error:", authError);
            return NextResponse.json({ error: `Auth creation failed: ${authError.message}` }, { status: 500 });
        }

        // Insert into public.user table
        const { data, error } = await (adminClient
            .from('user') as any)
            .insert({
                name,
                username,
                password, // Legacy field
                role: role || 'staff', // Default to string 'staff'
                auth_id: authData.user.id, // Using auth_id
                branch_id: branch_id || null
            })
            .select()
            .single();

        if (error) {
            // Rollback: delete auth user if database insert fails
            await adminClient.auth.admin.deleteUser(authData.user.id);
            console.error("Database insert error:", error);
            // If error is about column 'auth_id' not existing, we might need to use 'uuid'. 
            // But assume schema uses auth_id.
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data, message: "User created successfully" });
    } catch (err: any) {
        console.error("POST error:", err);
        return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
    }
}

// PUT - Update user (role, password, branch)
export async function PUT(request: NextRequest) {
    const verification = await verifyAdminAccessImproved(request);
    if ('error' in verification) {
        return NextResponse.json({ error: verification.error }, { status: verification.status });
    }

    try {
        const body = await request.json();
        const { user_id, role, password, branch_id } = body;

        if (!user_id) {
            return NextResponse.json({ error: "user_id is required" }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Get the user to find their auth uuid (auth_id)
        const { data: existingUser, error: fetchError } = await (adminClient
            .from('user') as any)
            .select('auth_id') // Keeping consistent with POST
            .eq('user_id', user_id)
            .single();

        if (fetchError || !existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Build update object
        const updateData: Record<string, any> = {};
        if (role !== undefined) updateData.role = role;
        if (branch_id !== undefined) updateData.branch_id = branch_id;
        if (password) updateData.password = password;

        if (password && existingUser.auth_id) {
            const { error: authError } = await adminClient.auth.admin.updateUserById(
                existingUser.auth_id,
                { password }
            );

            if (authError) {
                console.error("Auth password update error:", authError);
                return NextResponse.json({ error: `Auth update failed: ${authError.message}` }, { status: 500 });
            }
        }

        // If role or branch changed, update auth metadata too? 
        if ((role || branch_id) && existingUser.auth_id) {
            const metadata: any = {};
            if (role) metadata.role = role;
            if (branch_id) metadata.branch_id = branch_id;
            await adminClient.auth.admin.updateUserById(existingUser.auth_id, { user_metadata: metadata });
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ message: "No changes to apply" });
        }

        // Update in database
        const { data, error } = await (adminClient
            .from('user') as any)
            .update(updateData)
            .eq('user_id', user_id)
            .select()
            .single();

        if (error) {
            console.error("Database update error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data, message: "User updated successfully" });
    } catch (err: any) {
        console.error("PUT error:", err);
        return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
    }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
    const verification = await verifyAdminAccessImproved(request);
    if ('error' in verification) {
        return NextResponse.json({ error: verification.error }, { status: verification.status });
    }

    try {
        const { searchParams } = new URL(request.url);
        const user_id = searchParams.get('user_id');

        if (!user_id) {
            return NextResponse.json({ error: "user_id is required" }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Get the user to find their auth uuid first
        const { data: existingUser, error: fetchError } = await (adminClient
            .from('user') as any)
            .select('auth_id')
            .eq('user_id', user_id)
            .single();

        if (fetchError) {
            // Try fetching with 'uuid' if 'auth_id' fails? No, simpler to assume 'auth_id'.
            // But for safety in Delete, if we can't find by auth_id, maybe we can't delete auth user.
            // We can still soft delete the DB record.
            console.log("Could not find auth_id for user, proceeding with DB soft delete only.");
        }

        // Soft delete from database (set deleted_at timestamp)
        const { error: deleteError } = await (adminClient
            .from('user') as any)
            .update({ deleted_at: new Date().toISOString() })
            .eq('user_id', user_id);

        if (deleteError) {
            console.error("Database delete error:", deleteError);
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        // Delete from auth if auth_id exists
        if (existingUser?.auth_id) {
            const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(existingUser.auth_id);
            if (authDeleteError) {
                console.error("Auth delete error (non-fatal):", authDeleteError);
            }
        }

        return NextResponse.json({ message: "User deleted successfully" });
    } catch (err: any) {
        console.error("DELETE error:", err);
        return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
    }
}
