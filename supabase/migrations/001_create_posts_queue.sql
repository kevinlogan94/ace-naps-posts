create table if not exists posts_queue (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  posted_at timestamptz null,
  error_message text null,
  instagram_media_id text null
);

alter table posts_queue disable row level security;

grant insert, select on posts_queue to anon;

insert into storage.buckets (id, name, public)
values ('ace-photos', 'ace-photos', false)
on conflict (id) do nothing;

create policy "anon insert ace-photos"
on storage.objects for insert
to anon
with check (bucket_id = 'ace-photos');

create policy "anon select ace-photos"
on storage.objects for select
to anon
using (bucket_id = 'ace-photos');
