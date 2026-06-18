import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";

type AdminRole = "admin" | "super_admin";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function makeUsername(email: string) {
  return email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");
}

function response(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders(),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return response({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return response(
        { error: "Missing Supabase server environment variables" },
        500
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return response({ error: "Missing authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const { data: requesterData, error: requesterError } =
      await supabaseAdmin.auth.getUser(token);

    if (requesterError || !requesterData.user) {
      return response({ error: "Invalid admin session" }, 401);
    }

    const requesterId = requesterData.user.id;

    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, role")
      .eq("id", requesterId)
      .single();

    if (profileError || !requesterProfile) {
      return response({ error: "Requester profile not found" }, 403);
    }

    if (requesterProfile.role !== "super_admin") {
      return response({ error: "Only super admins can create admins" }, 403);
    }

    const body = await req.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const role = String(body.role || "admin").trim() as AdminRole;
    const fullName = String(body.full_name || "").trim();

    if (!email) {
      return response({ error: "Email is required" }, 400);
    }

    if (!password || password.length < 8) {
      return response({ error: "Password must be at least 8 characters" }, 400);
    }

    if (role !== "admin" && role !== "super_admin") {
      return response({ error: "Invalid admin role" }, 400);
    }

    const username = fullName || makeUsername(email);

    const { data: existingUsers, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      return response({ error: listError.message }, 500);
    }

    const existingUser = existingUsers.users.find(
      (user) => user.email?.toLowerCase() === email
    );

    let userId = existingUser?.id;

    if (!existingUser) {
      const { data: createdUser, error: createUserError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            username,
            full_name: fullName || username,
            role,
          },
        });

      if (createUserError || !createdUser.user) {
        return response(
          { error: createUserError?.message || "Could not create user" },
          500
        );
      }

      userId = createdUser.user.id;
    } else {
      const { error: updateUserError } =
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password,
          email_confirm: true,
          user_metadata: {
            ...(existingUser.user_metadata || {}),
            username: existingUser.user_metadata?.username || username,
            full_name:
              existingUser.user_metadata?.full_name || fullName || username,
            role,
          },
        });

      if (updateUserError) {
        return response({ error: updateUserError.message }, 500);
      }
    }

    const { data: profile, error: upsertProfileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,
          role,
          username,
          full_name: fullName || username,
          profile_completed: false,
        },
        { onConflict: "id" }
      )
      .select("id, email, username, full_name, role, created_at")
      .single();

    if (upsertProfileError) {
      return response({ error: upsertProfileError.message }, 500);
    }

    await supabaseAdmin.from("admin_logs").insert({
      admin_id: requesterId,
      action: existingUser ? "UPDATE_ADMIN_ACCOUNT" : "CREATE_ADMIN_ACCOUNT",
      target_table: "profiles",
      target_id: userId,
      description: `${requesterProfile.email} created/updated ${role} account for ${email}`,
    });

    return response({
      message: existingUser
        ? "Admin account updated successfully"
        : "Admin account created successfully",
      admin: profile,
    });
  } catch (error) {
    return response(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error",
      },
      500
    );
  }
});