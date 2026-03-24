import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";

const ALLOWED_DOMAIN = "@seazone.com.br";

function extractFirstLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName.trim();
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

async function registerResponsible(session: Session) {
  const user = session.user;
  if (!user) return;

  // Check if already registered by user_id
  const { data: existing } = await supabase
    .from("responsible_people")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return; // Already registered, don't add again

  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuário";
  const displayName = extractFirstLastName(fullName);
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

  await supabase.from("responsible_people").insert({
    name: displayName,
    avatar_url: avatarUrl,
    user_id: user.id,
  });
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateAndSet = async (s: Session | null) => {
      if (s?.user?.email && !s.user.email.endsWith(ALLOWED_DOMAIN)) {
        toast.error("Acesso permitido apenas para emails @seazone.com.br");
        await supabase.auth.signOut();
        setSession(null);
      } else {
        if (s) {
          // Register on first login only
          await registerResponsible(s);
        }
        setSession(s);
      }
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      validateAndSet(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      validateAndSet(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { session, loading, signOut };
}
