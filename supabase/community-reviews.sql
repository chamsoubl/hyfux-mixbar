-- Run in the Supabase SQL editor to enable public reviews with owner approval.
create table if not exists public.community_reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.community_reviews enable row level security;
revoke all on public.community_reviews from anon, authenticated;

drop function if exists public.submit_community_review(text, integer, text);
create function public.submit_community_review(p_name text, p_rating integer, p_comment text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 80
     or p_rating not between 1 and 5
     or char_length(coalesce(p_comment, '')) > 1000 then
    raise exception 'Invalid review details';
  end if;
  insert into public.community_reviews(name, rating, comment)
  values (trim(p_name), p_rating, nullif(trim(coalesce(p_comment, '')), ''));
end;
$$;
revoke all on function public.submit_community_review(text, integer, text) from public;
grant execute on function public.submit_community_review(text, integer, text) to anon, authenticated;

create or replace function public.get_public_community_reviews()
returns table(id uuid, rating smallint, comment text, customer_name text, created_at timestamptz)
language sql security definer set search_path = '' as $$
  select r.id, r.rating, r.comment, r.name as customer_name, r.created_at
  from public.community_reviews r where r.approved = true
  order by r.created_at desc limit 100;
$$;
revoke all on function public.get_public_community_reviews() from public;
grant execute on function public.get_public_community_reviews() to anon, authenticated;

create or replace function public.admin_community_reviews()
returns table(id uuid, name text, rating smallint, comment text, approved boolean, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.admin_role(), '') not in ('owner', 'admin', 'staff') then
    raise exception 'Not authorized';
  end if;
  return query select r.id, r.name, r.rating, r.comment, r.approved, r.created_at
    from public.community_reviews r order by r.created_at desc limit 500;
end;
$$;
revoke all on function public.admin_community_reviews() from public;
grant execute on function public.admin_community_reviews() to authenticated;

create or replace function public.moderate_community_review(p_id uuid, p_approved boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.admin_role(), '') not in ('owner', 'admin', 'staff') then
    raise exception 'Not authorized';
  end if;
  if p_approved then
    update public.community_reviews set approved = true where id = p_id;
  else
    delete from public.community_reviews where id = p_id;
  end if;
end;
$$;
revoke all on function public.moderate_community_review(uuid, boolean) from public;
grant execute on function public.moderate_community_review(uuid, boolean) to authenticated;
