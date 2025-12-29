import { supabase } from "../supabase";

export async function updateProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { email, user_metadata } = user;

  await supabase.from("users").upsert({
    id: user.id,
    email: email,
    name: user_metadata.name || null,
    npm: user_metadata.npm || null,
    phone: user_metadata.phone || null
  });
}
