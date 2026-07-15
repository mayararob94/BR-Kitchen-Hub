-- ─────────────────────────────────────────────────────────────────────────
-- BR Kitchen Hub — development seed
--
-- Creates the initial operator, one kitchen + space, default settings, and a
-- SUPER ADMIN account so you can sign in during Phase 1.
--
-- 1. Replace the email below (:admin_email) with YOUR email.
-- 2. Apply after the migration:
--      npm run db:migrate:local
--      wrangler d1 execute br-kitchen-hub-db --local --file=scripts/seed.sql
--    (use --remote for the deployed database).
-- 3. Sign in at /login with that email; the OTP prints to the dev server log
--    until Resend is configured.
-- ─────────────────────────────────────────────────────────────────────────

-- >>> EDIT THIS EMAIL <<<
-- SQLite has no variables; edit the two occurrences of the email below.

-- Operator (single tenant for now).
INSERT OR IGNORE INTO operators (id, name, legal_name, timezone, currency)
VALUES ('op_default', 'BR Kitchen Hub', 'BR Kitchen Hub Pty Ltd', 'Australia/Brisbane', 'AUD');

-- Kitchen + a bookable space.
INSERT OR IGNORE INTO kitchens (id, operator_id, name, slug, state, timezone)
VALUES ('kit_goldcoast', 'op_default', 'Gold Coast Commercial Kitchen', 'gold-coast', 'QLD', 'Australia/Brisbane');

INSERT OR IGNORE INTO kitchen_spaces (id, kitchen_id, name, kind, capacity)
VALUES ('spc_main', 'kit_goldcoast', 'Main Production Area', 'shared', 4);

-- Super admin user + profile. EDIT the email here:
INSERT OR IGNORE INTO users (id, email, status, email_verified_at)
VALUES ('usr_admin', 'owner@brkitchenhub.com.au', 'active', strftime('%Y-%m-%dT%H:%M:%SZ','now'));

INSERT OR IGNORE INTO profiles (user_id, full_name, timezone)
VALUES ('usr_admin', 'Kitchen Owner', 'Australia/Brisbane');

INSERT OR IGNORE INTO role_assignments (id, user_id, role, scope_type, scope_id)
VALUES ('ra_admin', 'usr_admin', 'super_admin', 'global', NULL);

-- Default business / financial settings (global scope, JSON-encoded values).
INSERT OR IGNORE INTO system_settings (id, scope_type, scope_id, key, value) VALUES
  ('set_business_name', 'global', NULL, 'business_name', '"BR Kitchen Hub"'),
  ('set_legal_name',    'global', NULL, 'legal_name',    '"BR Kitchen Hub Pty Ltd"'),
  ('set_abn',           'global', NULL, 'abn',           '""'),
  ('set_address',       'global', NULL, 'address',       '""'),
  ('set_phone',         'global', NULL, 'phone',         '""'),
  ('set_email',         'global', NULL, 'email',         '""'),
  ('set_timezone',      'global', NULL, 'timezone',      '"Australia/Brisbane"'),
  ('set_currency',      'global', NULL, 'currency',      '"AUD"'),
  ('set_gst_enabled',   'global', NULL, 'gst_enabled',   'true'),
  ('set_gst_rate_bps',  'global', NULL, 'gst_rate_bps',  '1000'),
  ('set_invoice_prefix','global', NULL, 'invoice_prefix','"INV-"'),
  ('set_payment_terms', 'global', NULL, 'payment_terms_days', '7');
