//lib/importUtils
import { supabase } from "./supabaseClient";

/**
 * Vérifie si un flyer a déjà été importé pour un magasin et si sa période est encore valide
 */
export async function isFlyerAlreadyImported(flyerId: number, store: "IGA" | "Metro"): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);

  const { count, error } = await supabase
    .from("promotions")
    .select("*", { count: "exact", head: true })
    .eq("flyer_id", flyerId)
    .eq("store_name", store)
    .gte("end_date", today);

  if (error) {
    console.error(`❌ Erreur vérification flyer ${flyerId}:`, error);
    return false; // En cas d'erreur, tenter quand même
  }

  return (count || 0) > 0;
}
