"use server";

import { supabase } from "@/lib/supabaseClient"; 
// NOTE: This imports your existing client. 
// If you run into "cookie" or "auth" issues later, you may need to swap this 
// for the official '@supabase/ssr' createServerClient function. 
// For now, this works for querying your public.user table.

// -----------------------------------------------------------------------------
// LOGIN ACTION
// -----------------------------------------------------------------------------
export async function loginAction(username: string, password: string) {
  try {
    // Check if supabase client is initialized
    if (!supabase) {
      return { success: false, message: "Database connection not available." };
    }

    // 1. Query the database to find the user by username
    const { data: user, error } = await supabase
      .from("user") // Ensure your table name is correct (e.g. 'user' or 'users')
      .select("user_id, name, username, password, role")
      .eq("username", username)
      .single() as { data: { user_id: number; name: string; username: string; password: string; role: number } | null; error: any };

    // 2. Handle User Not Found or Database Error
    if (error || !user) {
      console.error("Login Lookup Error:", error?.message);
      return { success: false, message: "User not found." };
    }

    // 3. Check Password (Simple String Comparison)
    // WARNING: In a production app, you should use bcrypt.compare() here!
    if (user.password !== password) {
      return { success: false, message: "Incorrect password." };
    }

    // 4. Remove sensitive data before sending back to client
    const { password: _, ...safeUser } = user;

    return { success: true, user: safeUser };

  } catch (error) {
    console.error("Server Error:", error);
    return { success: false, message: "An unexpected error occurred." };
  }
}

// -----------------------------------------------------------------------------
// REGISTER ACTION
// -----------------------------------------------------------------------------
export async function registerAction(formData: { 
  firstName: string; 
  lastName: string; 
  username: string;
  password: string;
}) {
  const { firstName, lastName, username, password } = formData;

  try {
    // Check if supabase client is initialized
    if (!supabase) {
      return { success: false, message: "Database connection not available." };
    }

    // 1. Check if username already exists
    const { data: existingUser } = await supabase
      .from("user")
      .select("username")
      .eq("username", username)
      .single();

    if (existingUser) {
      return { success: false, message: "Username is already taken." };
    }

    // 2. Insert new user
    const { data, error } = await supabase
      .from("user")
      .insert({
        name: `${firstName} ${lastName}`,
        username: username,
        password: password, // (Remember: This is storing plain text. Consider hashing!)
        role: 0 // Default to Guest (0)
      })
      .select()
      .single();

    if (error) {
      console.error("Registration DB Error:", error.message);
      return { success: false, message: `Database error: ${error.message}` };
    }

    return { success: true };

  } catch (error) {
    console.error("Server Error:", error);
    return { success: false, message: "An unexpected error occurred." };
  }
}