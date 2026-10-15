-- Run once in a NEW Supabase project's SQL editor.
begin;
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 nickname text not null check (char_length(trim(nickname)) between 1 and 30),
 bio text not null default '' check (char_length(bio) <= 200),
 avatar_path text,
 created_at timestamptz not null default now(),
 check (avatar_path is null or avatar_path like id::text || '/%')
);
create table public.posts (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 kind text not null default 'square' check (kind in ('square','msgboard')),
 body text not null default '' check (char_length(body) <= 2000),
 image_path text,
 created_at timestamptz not null default now(),
 check (char_length(trim(body)) > 0 or image_path is not null),
 check (image_path is null or image_path like author_id::text || '/%')
);
create table public.comments (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.posts(id) on delete cascade,
 author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 body text not null check (char_length(trim(body)) between 1 and 500),
 created_at timestamptz not null default now()
);
create table public.reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 post_id uuid not null references public.posts(id) on delete cascade,
 reason text not null check (char_length(trim(reason)) between 1 and 300),
 created_at timestamptz not null default now(), unique(reporter_id,post_id)
);
create index on public.posts(kind,created_at desc,id desc);
create index on public.posts(author_id,created_at);
create index on public.comments(author_id,created_at);
create index on public.reports(post_id);
create index on public.comments(post_id,created_at);
create function private.new_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,nickname) values(new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'nickname'),''),'新用户'),30));
 return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.new_profile();
revoke all on function private.new_profile() from public,anon,authenticated;
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;
revoke all on public.profiles,public.posts,public.comments,public.reports from anon,authenticated;
grant select on public.profiles,public.posts,public.comments to authenticated;
grant update(nickname,bio,avatar_path) on public.profiles to authenticated;
grant insert(author_id,kind,body,image_path), delete on public.posts to authenticated;
grant insert(post_id,author_id,body), delete on public.comments to authenticated;
grant insert(reporter_id,post_id,reason) on public.reports to authenticated;
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_edit on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy posts_read on public.posts for select to authenticated using (true);
create policy posts_add on public.posts for insert to authenticated with check (author_id=(select auth.uid()));
create policy posts_remove on public.posts for delete to authenticated using (author_id=(select auth.uid()));
create policy comments_read on public.comments for select to authenticated using (true);
create policy comments_add on public.comments for insert to authenticated with check (author_id=(select auth.uid()));
create policy comments_remove on public.comments for delete to authenticated using (author_id=(select auth.uid()));
create policy reports_add on public.reports for insert to authenticated with check (reporter_id=(select auth.uid()));
-- Hard per-user write limit, enforced even when the browser is bypassed.
create function private.limit_community_write() returns trigger language plpgsql security definer set search_path = '' as $$
declare n integer; actor uuid := auth.uid();
begin
 if actor is null then raise exception 'Login required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 if tg_table_name='posts' then select count(*) into n from public.posts where author_id=actor and created_at>now()-interval '1 minute';
 elsif tg_table_name='comments' then select count(*) into n from public.comments where author_id=actor and created_at>now()-interval '1 minute';
 else select count(*) into n from public.reports where reporter_id=actor and created_at>now()-interval '1 minute'; end if;
 if n>=5 then raise exception '操作过于频繁，请一分钟后再试'; end if;
 return new;
end; $$;
revoke all on function private.limit_community_write() from public,anon,authenticated;
create trigger limit_posts before insert on public.posts for each row execute function private.limit_community_write();
create trigger limit_comments before insert on public.comments for each row execute function private.limit_community_write();
create trigger limit_reports before insert on public.reports for each row execute function private.limit_community_write();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('community-images','community-images',false,2097152,array['image/jpeg','image/png','image/webp']);
create policy images_read on storage.objects for select to authenticated using (bucket_id='community-images');
create policy images_add on storage.objects for insert to authenticated with check (bucket_id='community-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy images_remove on storage.objects for delete to authenticated using (bucket_id='community-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
