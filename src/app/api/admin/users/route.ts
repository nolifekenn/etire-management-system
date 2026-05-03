/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient, getUserSafe } from "@/lib/supabaseServer";

const PIN_REGEX = /^\d{6}$/;
const DEFAULT_MANAGER_PIN = '112233';

// Verify the request comes from an authenticated super admin.
// Uses getUser() which always re-validates against the Supabase Auth server,
// unlike getSession() which can return a stale/revoked cached token.
async function verifyAdminAccessImproved(_request: NextRequest) {
    const supabase = await createClient();
    const { user, error: authError } = await getUserSafe(supabase);

    if (authError || !user) {
        return { error: "Unauthorized", status: 401 };
    }

    const { data: userProfile, error } = await supabase
        .from('user')
        .select('user_id, role')
        .eq('auth_id', user.id)
        .single();

    if (error || !userProfile) {
        console.error("[admin/users] Profile not found for auth id:", user.id);
        return { error: "Could not verify user profile", status: 401 };
    }

    const role = (userProfile as { user_id: string; role: string }).role;
    if (role !== 'super_admin') {
        return { error: "Insufficient permissions", status: 403 };
    }

    return { userProfile, user };
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
        const { name, username, password, pin, role, branch_id } = body;
        const normalizedRole = String(role || 'staff');
        const pinInput = pin == null ? '' : String(pin).trim();
        const normalizedPin = pinInput === '' ? null : pinInput;
        const resolvedManagerPin = normalizedRole === 'branch_manager'
            ? (normalizedPin ?? DEFAULT_MANAGER_PIN)
            : null;

        if (!name || !username || !password) {
            return NextResponse.json({ error: "Name, username, and password are required" }, { status: 400 });
        }

        if (normalizedRole === 'branch_manager') {
            if (!resolvedManagerPin || !PIN_REGEX.test(resolvedManagerPin)) {
                return NextResponse.json({ error: "Branch manager PIN must be exactly 6 digits" }, { status: 400 });
            }
        } else if (normalizedPin) {
            return NextResponse.json({ error: "PIN can only be set for branch managers" }, { status: 400 });
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
                role: normalizedRole,
                auth_id: authData.user.id, // Using auth_id
                branch_id: branch_id || null,
                pin: resolvedManagerPin
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
    } catch (err: unknown) {
        console.error("POST error:", err);
        return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
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
        const { user_id, role, password, pin, branch_id } = body;
        const pinWasProvided = pin !== undefined;
        const pinInput = pin == null ? '' : String(pin).trim();
        const normalizedInputPin = pinInput === '' ? null : pinInput;

        if (!user_id) {
            return NextResponse.json({ error: "user_id is required" }, { status: 400 });
        }

        if (normalizedInputPin && !PIN_REGEX.test(normalizedInputPin)) {
            return NextResponse.json({ error: "PIN must be exactly 6 digits" }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Get the user to find their auth uuid (auth_id)
        const { data: existingUser, error: fetchError } = await (adminClient
            .from('user') as any)
            .select('auth_id, role, pin')
            .eq('user_id', user_id)
            .single();

        if (fetchError || !existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Build update object
        const updateData: Record<string, unknown> = {};
        if (role !== undefined) updateData.role = role;
        if (branch_id !== undefined) updateData.branch_id = branch_id;
        if (password) updateData.password = password;

        const targetRole = String(role ?? existingUser.role);

        if (targetRole === 'branch_manager') {
            if (pinWasProvided) {
                updateData.pin = normalizedInputPin || DEFAULT_MANAGER_PIN;
            } else if (existingUser.pin === null) {
                updateData.pin = DEFAULT_MANAGER_PIN;
            }
        } else {
            if (pinWasProvided && normalizedInputPin) {
                return NextResponse.json({ error: "PIN can only be set for branch managers" }, { status: 400 });
            }

            if (existingUser.pin !== null || pinWasProvided) {
                updateData.pin = null;
            }
        }

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
            const metadata: { role?: string; branch_id?: string } = {};
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
    } catch (err: unknown) {
        console.error("PUT error:", err);
        return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
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
    } catch (err: unknown) {
        console.error("DELETE error:", err);
        return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
    }
}
