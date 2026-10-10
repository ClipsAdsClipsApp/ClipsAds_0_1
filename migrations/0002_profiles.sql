create table if not exists profiles (
  user_id      text primary key,
  username     text not null,
  display_name text not null,
  bio          text not null default '',
  city         text not null default 'Parla',
  avatar_url   text not null default '',
  role         text not null default 'user',
  updated_at   timestamptz not null default now()
);
create index if not exists profiles_username_idx on profiles (username);
