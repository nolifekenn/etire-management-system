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
        .select('user_id, role')
        .eq('uuid', session.user.id)
        .single();

    if (error || !userProfile) {
        return { error: "Could not verify user profile", status: 401 };
    }

    // Only role 2 (Manager) and 3 (Admin) can access admin functions
    if ((userProfile as any).role !== 2 && (userProfile as any).role !== 3) {
        return { error: "Insufficient permissions", status: 403 };
    }

    return { userProfile, session };
}

// GET - Fetch all users
export async function GET(request: NextRequest) {
    const verification = await verifyAdminAccess(request);
    if ('error' in verification) {
        return NextResponse.json({ error: verification.error }, { status: verification.status });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
        .from('user')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}

// POST - Create new user
export async function POST(request: NextRequest) {
    const verification = await verifyAdminAccess(request);
    if ('error' in verification) {
        return NextResponse.json({ error: verification.error }, { status: verification.status });
    }

    try {
        const body = await request.json();
        const { name, username, password, role } = body;

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
                password, // Store for reference (legacy support)
                role: role ?? 1,
                uuid: authData.user.id,
            })
            .select()
            .single();

        if (error) {
            // Rollback: delete auth user if database insert fails
            await adminClient.auth.admin.deleteUser(authData.user.id);
            console.error("Database insert error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data, message: "User created successfully" });
    } catch (err: any) {
        console.error("POST error:", err);
        return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
    }
}

// PUT - Update user (role or password)
export async function PUT(request: NextRequest) {
    const verification = await verifyAdminAccess(request);
    if ('error' in verification) {
        return NextResponse.json({ error: verification.error }, { status: verification.status });
    }

    try {
        const body = await request.json();
        const { user_id, role, password } = body;

        if (!user_id) {
            return NextResponse.json({ error: "user_id is required" }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Get the user to find their auth uuid
        const { data: existingUser, error: fetchError } = await (adminClient
            .from('user') as any)
            .select('uuid')
            .eq('user_id', user_id)
            .single();

        if (fetchError || !existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Build update object
        const updateData: Record<string, any> = {};
        if (role !== undefined) {
            updateData.role = role;
        }
        if (password) {
            updateData.password = password;

            // Also update auth password if user has uuid
            if (existingUser.uuid) {
                const { error: authError } = await adminClient.auth.admin.updateUserById(
                    existingUser.uuid,
                    { password }
                );

                if (authError) {
                    console.error("Auth password update error:", authError);
                    return NextResponse.json({ error: `Auth update failed: ${authError.message}` }, { status: 500 });
                }
            }
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
    const verification = await verifyAdminAccess(request);
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
            .select('uuid')
            .eq('user_id', user_id)
            .single();

        if (fetchError) {
            console.error("Fetch error:", fetchError);
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Delete from database first
        const { error: deleteError } = await adminClient
            .from('user')
            .delete()
            .eq('user_id', user_id);

        if (deleteError) {
            console.error("Database delete error:", deleteError);
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        // Delete from auth if uuid exists
        if (existingUser?.uuid) {
            const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(existingUser.uuid);
            if (authDeleteError) {
                console.error("Auth delete error (non-fatal):", authDeleteError);
                // Don't fail the request if auth deletion fails - the DB user is already deleted
            }
        }

        return NextResponse.json({ message: "User deleted successfully" });
    } catch (err: any) {
        console.error("DELETE error:", err);
        return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
    }
}
