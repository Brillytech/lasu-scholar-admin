import { supabase } from "../lib/supabase";

export type AppReview = {
  id: string;
  user_id: string;
  display_name: string | null;
  department: string | null;
  level: string | null;
  rating: number;
  review: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export async function getAppReviews(status?: "pending" | "approved" | "rejected" | "all") {
  let query = supabase
    .from("app_reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []) as AppReview[];
}

export async function updateReviewStatus(
  id: string,
  status: "approved" | "rejected" | "pending"
) {
  const { data, error } = await supabase
    .from("app_reviews")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;

  return data as AppReview;
}

export async function deleteAppReview(id: string) {
  const { error } = await supabase.from("app_reviews").delete().eq("id", id);

  if (error) throw error;

  return true;
}
