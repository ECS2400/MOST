-- Auto-create profile row when a new auth user is created (e.g. Google OAuth).
-- Backfill existing auth.users without a matching profile.

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    name,
    preferred_language,
    plan,
    plan_expires_at,
    avatar_color,
    created_at
  )
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'pl',
    'free',
    null,
    '#A855F7',
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Backfill existing auth.users missing a profile row
INSERT INTO public.profiles (id, email, name, preferred_language, plan, plan_expires_at, avatar_color, created_at)
SELECT
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  'pl',
  'free',
  null,
  '#A855F7',
  now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
