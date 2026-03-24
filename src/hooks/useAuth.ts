import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";

const ALLOWED_DOMAIN = "@seazone.com.br";

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
