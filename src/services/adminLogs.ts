import { supabase } from "../lib/supabase";

export type AdminLog = {
  id: string;
  admin_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  description: string | null;
  created_at: string;
  profiles?: {
    email: string | null;
    username: string | null;
    full_name: string | null;
  } | null;
};

export async function getAdminLogs(limit = 50) {
  const { data, error } = await supabase
    .from("admin_logs")
    .select(`
      *,
      profiles (
        email,
        username,
        full_name
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data as AdminLog[];
}

export async function createAdminLog(payload: {
  admin_id?: string | null;
  action: string;
  target_table?: string | null;
  target_id?: string | null;
  description?: string | null;
}) {
  const { data, error } = await supabase
    .from("admin_logs")
    .insert({
      admin_id: payload.admin_id || null,
      action: payload.action,
      target_table: payload.target_table || null,
      target_id: payload.target_id || null,
      description: payload.description || null,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}