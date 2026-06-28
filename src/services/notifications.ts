import { supabase } from "../lib/supabase";

export type NotificationAudience = "all" | "school" | "faculty" | "department" | "level" | "admin";
export type NotificationPriority = "normal" | "important" | "urgent";
export type NotificationSource = "admin" | "system";

export type Notification = {
  id: string;
  title: string;
  message: string | null;
  type: string | null;
  is_read: boolean;
  created_at: string;

  audience?: NotificationAudience | string | null;
  target_role?: string | null;
  target_school?: string | null;
  target_faculty?: string | null;
  target_department?: string | null;
  target_level?: string | null;

  source?: NotificationSource | string | null;
  priority?: NotificationPriority | string | null;
  action_url?: string | null;
  expires_at?: string | null;
  is_published?: boolean | null;
  posted_by?: string | null;
};

function clean(value?: string | null) {
  return String(value || "").trim();
}

function emptyToNull(value?: string | null) {
  const next = clean(value);
  return next || null;
}

export async function getNotifications(limit = 100) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data as Notification[];
}

export async function getUnreadNotificationsCount() {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) throw error;

  return count || 0;
}

export async function createNotification(payload: {
  title: string;
  message: string;
  type: string;
  audience: NotificationAudience;
  target_role?: string;
  target_school?: string;
  target_faculty?: string;
  target_department?: string;
  target_level?: string;
  priority?: NotificationPriority;
  action_url?: string;
  expires_at?: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const audience = payload.audience || "all";

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      title: clean(payload.title),
      message: clean(payload.message),
      type: clean(payload.type || "announcement"),
      audience,
      target_role: clean(payload.target_role || (audience === "admin" ? "admin" : "student")),
      target_school: emptyToNull(payload.target_school),
      target_faculty: emptyToNull(payload.target_faculty),
      target_department: emptyToNull(payload.target_department),
      target_level: emptyToNull(payload.target_level),
      priority: clean(payload.priority || "normal"),
      action_url: emptyToNull(payload.action_url),
      expires_at: emptyToNull(payload.expires_at),
      source: "admin",
      is_published: true,
      is_read: false,
      posted_by: user?.id || null,
    })
    .select()
    .single();

  if (error) throw error;

  return data as Notification;
}

export async function getStudentNotifications(profile: {
  school?: string | null;
  faculty?: string | null;
  department?: string | null;
  level?: string | null;
}) {
  const school = clean(profile.school);
  const faculty = clean(profile.faculty);
  const department = clean(profile.department);
  const level = clean(profile.level);

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("is_published", true)
    .or(
      [
        "audience.eq.all",
        `and(audience.eq.school,target_school.eq.${school})`,
        `and(audience.eq.faculty,target_school.eq.${school},target_faculty.eq.${faculty})`,
        `and(audience.eq.department,target_school.eq.${school},target_department.eq.${department})`,
        `and(audience.eq.level,target_school.eq.${school},target_department.eq.${department},target_level.eq.${level})`,
      ].join(",")
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  return data as Notification[];
}

export async function createSystemNotification(payload: {
  title: string;
  message: string;
  type: string;
  target_role?: string;
  priority?: NotificationPriority;
  action_url?: string;
}) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      title: clean(payload.title),
      message: clean(payload.message),
      type: clean(payload.type || "system"),
      audience: payload.target_role === "admin" ? "admin" : "all",
      target_role: clean(payload.target_role || "admin"),
      priority: clean(payload.priority || "normal"),
      action_url: emptyToNull(payload.action_url),
      source: "system",
      is_published: true,
      is_read: false,
    })
    .select()
    .single();

  if (error) throw error;

  return data as Notification;
}

export async function markNotificationAsRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) throw error;
}

export async function markAllNotificationsAsRead() {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false);

  if (error) throw error;
}

export async function deleteNotification(id: string) {
  const { error } = await supabase.from("notifications").delete().eq("id", id);

  if (error) throw error;
}
