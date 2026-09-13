-- Demo seed data for JobGrid (safe to run once on a fresh project).
-- Creates confirmed demo users (bypasses email confirmation), companies and
-- a set of live job ads so the board looks alive.
--
-- Demo logins (password for all: JobGridDemo1!):
--   delivered@resend.dev            employer  (Nimbus AI)
--   delivered+candidate@resend.dev  candidate (Alex Chen)

create or replace function pg_temp.seed_user(
  p_email text,
  p_name text,
  p_role text
) returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, is_super_admin
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    p_email, extensions.crypt('JobGridDemo1!', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_name, 'role', p_role),
    now(), now(), '', '', '', '', '', false
  );
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
    'email', now(), now(), now()
  );
  return v_id;
end;
$$;

do $$
declare
  v_employer uuid;
  v_employer2 uuid;
  v_employer3 uuid;
  v_candidate uuid;
  v_nimbus uuid;
  v_medcare uuid;
  v_forge uuid;
begin
  v_employer := pg_temp.seed_user('delivered@resend.dev', 'Sarah Nguyen', 'employer');
  v_employer2 := pg_temp.seed_user('delivered+medcare@resend.dev', 'James Patel', 'employer');
  v_employer3 := pg_temp.seed_user('delivered+forge@resend.dev', 'Mia Torres', 'employer');
  v_candidate := pg_temp.seed_user('delivered+candidate@resend.dev', 'Alex Chen', 'candidate');

  insert into public.companies (owner_id, name, slug, tagline, description, location, website, brand_color)
  values
    (v_employer, 'Nimbus AI', 'nimbus-ai', 'Applied AI for the enterprise',
     'Nimbus AI builds retrieval and agent platforms used by Fortune 500 teams. Series B, 80 people, Sydney HQ with remote-first engineering.',
     'Sydney, NSW', 'https://nimbus.example.com', '#6366f1')
  returning id into v_nimbus;

  insert into public.companies (owner_id, name, slug, tagline, description, location, website, brand_color)
  values
    (v_employer2, 'MedCare Group', 'medcare-group', 'Better care, everywhere',
     'MedCare operates 40+ clinics across QLD and NSW with a focus on GP and allied health services.',
     'Southport, QLD', 'https://medcare.example.com', '#0ea5e9')
  returning id into v_medcare;

  insert into public.companies (owner_id, name, slug, tagline, description, location, website, brand_color)
  values
    (v_employer3, 'Forge Robotics', 'forge-robotics', 'Robots for the real world',
     'Forge builds autonomous warehouse robots. Melbourne-based, backed by Blackbird.',
     'Melbourne, VIC', 'https://forge.example.com', '#f97316')
  returning id into v_forge;

  -- Seed credits so seeded companies can post at each tier.
  insert into public.purchases (company_id, product_code, quantity, credits_remaining, unit_price_cents, total_cents, status) values
    (v_medcare, 'premium', 1, 0, 19900, 19900, 'paid'),
    (v_medcare, 'basic', 1, 0, 4900, 4900, 'paid'),
    (v_forge, 'branded', 1, 0, 9900, 9900, 'paid'),
    (v_forge, 'basic', 1, 0, 4900, 4900, 'paid');

  insert into public.jobs (company_id, created_by, title, slug, description, highlights, category, location, is_remote, work_type, salary_min, salary_max, salary_period, skills, tier, status, published_at, expires_at) values
    (v_medcare, v_employer2, 'General Practitioner (VR) — Private Billing', 'gp-vr-private-billing-3fa1',
     E'Join an established private-billing practice on the Gold Coast.\n\nVery flexible with days and hours — you set your schedule. 70% of billings or $180/hr guaranteed for the first 3 months. Established patient base from a departing doctor, full-time nursing support and on-site pathology.\n\nRequirements: AHPRA registration, FRACGP, unrestricted VR.',
     array['Very flexible with days and hours', '70% of billings or $180/hr (first 3 months)', 'Established patient base from departing doctor'],
     'Healthcare', 'Southport, QLD', false, 'full_time', 150, 300, 'hour',
     array['General Practice', 'Patient Care'], 'premium', 'active', now() - interval '2 days', now() + interval '58 days'),

    (v_medcare, v_employer2, 'Practice Nurse — Chronic Disease Management', 'practice-nurse-cdm-8b22',
     E'Support our GP team across two Gold Coast clinics.\n\nYou will run chronic disease clinics, health assessments and care plans. Modern facilities, friendly team, ongoing CPD budget.',
     array[]::text[], 'Healthcare', 'Southport, QLD', false, 'part_time', 75000, 88000, 'year',
     array['Nursing', 'Patient Care'], 'basic', 'active', now() - interval '5 days', now() + interval '25 days'),

    (v_forge, v_employer3, 'Senior Embedded Engineer — Autonomy', 'senior-embedded-autonomy-c913',
     E'Own the firmware stack on our next-gen warehouse robot.\n\nYou will work on motor control, sensor fusion and safety-rated firmware (C++/Rust on RTOS). Ship code that runs on hundreds of robots moving real freight.\n\nStack: C++, Rust, Zephyr, CAN, ROS 2.',
     array['Equity + bonus', 'Onsite robotics lab in Collingwood', 'Relocation support available'],
     'Engineering', 'Melbourne, VIC', false, 'full_time', 150000, 185000, 'year',
     array['C++', 'Rust', 'Embedded Systems', 'Linux'], 'branded', 'active', now() - interval '1 day', now() + interval '44 days'),

    (v_forge, v_employer3, 'Robotics Software Intern', 'robotics-software-intern-d3e4',
     E'Summer internship with the autonomy team.\n\nWork on perception pipelines and simulation tooling alongside senior engineers. Python + C++ required, ROS experience a plus.',
     array[]::text[], 'Engineering', 'Melbourne, VIC', false, 'internship', 35, 45, 'hour',
     array['Python', 'C++', 'Computer Vision'], 'basic', 'active', now() - interval '3 days', now() + interval '27 days');
end;
$$;
