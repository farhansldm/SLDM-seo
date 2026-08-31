import { createClient } from "@supabase/supabase-js";

import { env } from "../config/env.js";

export class SupabaseAuthProvider {
  constructor(client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false } })) {
    this.client = client;
  }

  async verifyAccessToken(accessToken) {
    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error || !data.user) {
      const authError = new Error("Invalid or expired Supabase session");
      authError.statusCode = 401;
      throw authError;
    }
    return data.user;
  }
}
