-- =============================================================================
-- subscriptions table + market_rates seed
-- =============================================================================

-- Stripe subscription tracking per company
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.profiles(id) on delete cascade not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'studio',
  status text not null default 'inactive',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Companies can read their own subscription"
  on public.subscriptions for select using (company_id = auth.uid());

create index if not exists subscriptions_company_id_idx on public.subscriptions(company_id);
create index if not exists subscriptions_stripe_subscription_id_idx on public.subscriptions(stripe_subscription_id);

create or replace function public.update_subscriptions_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.update_subscriptions_updated_at();

-- Seed market_rates if empty
insert into public.market_rates (skill, location, p25, median, p75, currency, trend, delta)
select * from (values
  ('React',          'Remote · EU',   55000,  75000,  95000, 'EUR', 'up',   12),
  ('TypeScript',     'Remote · EU',   58000,  78000,  98000, 'EUR', 'up',   15),
  ('Node.js',        'Remote · EU',   52000,  70000,  90000, 'EUR', 'flat',  3),
  ('Python',         'Remote · EU',   55000,  73000,  95000, 'EUR', 'up',    9),
  ('Next.js',        'Remote · EU',   60000,  80000, 102000, 'EUR', 'up',   18),
  ('Go',             'Remote · EU',   62000,  85000, 108000, 'EUR', 'up',   11),
  ('Rust',           'Remote · EU',   65000,  90000, 115000, 'EUR', 'up',   20),
  ('SQL',            'Remote · EU',   48000,  65000,  85000, 'EUR', 'flat',  2),
  ('Docker',         'Remote · EU',   55000,  72000,  92000, 'EUR', 'flat',  4),
  ('Kubernetes',     'Remote · EU',   68000,  88000, 112000, 'EUR', 'up',   14),
  ('AWS',            'Remote · EU',   65000,  85000, 108000, 'EUR', 'up',   10),
  ('Figma',          'Remote · EU',   45000,  62000,  80000, 'EUR', 'up',    8),
  ('Vue',            'Remote · EU',   50000,  68000,  88000, 'EUR', 'flat',  1),
  ('Flutter',        'Remote · EU',   55000,  72000,  93000, 'EUR', 'up',    7),
  ('GraphQL',        'Remote · EU',   58000,  76000,  98000, 'EUR', 'flat',  5),
  ('AI / ML',        'Remote · EU',   70000,  95000, 125000, 'EUR', 'up',   25),
  ('LLMs',           'Remote · EU',   75000, 105000, 140000, 'EUR', 'up',   35),
  ('Solidity',       'Remote · EU',   65000,  90000, 120000, 'EUR', 'flat',  2)
) as v(skill, location, p25, median, p75, currency, trend, delta)
where not exists (select 1 from public.market_rates limit 1);
