create table if not exists user_status (
  user_id        text primary key,
  role           text not null default 'user'
                 check (role in ('user', 'creator', 'company')),
  blocked_at     timestamptz,
  blocked_reason text
);

create table if not exists reports (
  id              text primary key,
  reporter_user_id text not null,
  target_type      text not null check (target_type in ('clip', 'comment')),
  target_id        text not null,
  reason           text not null,
  status           text not null default 'pending'
                   check (status in ('pending', 'resolved')),
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz,
  resolved_by      text
);
create index if not exists reports_status_created_idx
  on reports (status, created_at desc);
create index if not exists reports_target_idx
  on reports (target_type, target_id);
create unique index if not exists reports_one_pending_per_reporter_idx
  on reports (reporter_user_id, target_type, target_id)
  where status = 'pending';

create table if not exists admin_audit_log (
  id          text primary key,
  admin_id    text not null,
  action      text not null,
  target_type text not null,
  target_id   text not null,
  created_at  timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx
  on admin_audit_log (created_at desc);

create table if not exists payments (
  id         text primary key,
  amount     numeric(12, 2) not null,
  user_id    text not null,
  type       text not null,
  created_at timestamptz not null default now()
);
create index if not exists payments_created_idx on payments (created_at desc);
