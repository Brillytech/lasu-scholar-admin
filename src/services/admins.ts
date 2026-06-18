import { supabase } from "../lib/supabase";

export type AdminRole = "admin" | "super_admin";

export type AdminUser = {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
  role: AdminRole | string | null;
  created_at: string;
};

export async function getAdmins() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, username, full_name, role, created_at")
    .in("role", ["admin", "super_admin"])
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data as AdminUser[];
}

export async function createAdminAccount(payload: {
  email: string;
  password: string;
  role: AdminRole;
  full_name?: string;
}) {
  const { data, error } = await supabase.functions.invoke("create-admin", {
    body: {
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      role: payload.role,
      full_name: payload.full_name?.trim() || "",
    },
  });

  if (error) {
    throw new Error(error.message || "Could not create admin account.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data.admin as AdminUser;
}

export async function removeAdmin(id: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ role: "student" })
    .eq("id", id);

  if (error) throw error;
}