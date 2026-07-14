-- Partner need signals: one current need per user, visible to couple partner
create table if not exists public.partner_need_signals (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  couple_id uuid references public.couples(id) on delete set null,
  need_id text not null,
  updated_at timestamptz not null default now()
);

create index if not exists partner_need_signals_couple_idx
  on public.partner_need_signals (couple_id, updated_at desc);

alter table public.partner_need_signals enable row level security;

drop policy if exists "partner_need_own_all" on public.partner_need_signals;
create policy "partner_need_own_all"
  on public.partner_need_signals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "partner_need_couple_read" on public.partner_need_signals;
create policy "partner_need_couple_read"
  on public.partner_need_signals
  for select
  using (
    couple_id is not null
    and exists (
      select 1 from public.couples c
      where c.id = partner_need_signals.couple_id
        and (c.partner_1_id = auth.uid() or c.partner_2_id = auth.uid())
    )
  );
