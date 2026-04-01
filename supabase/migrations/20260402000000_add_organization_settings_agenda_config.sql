-- 2.1.1 ORGANIZATION_SETTINGS (Agenda config)

ALTER TABLE public.organization_settings
ADD COLUMN IF NOT EXISTS agenda_config jsonb;

-- Keep existing rows up to date with default if needed
UPDATE public.organization_settings
SET agenda_config = jsonb_build_object(
  'days', jsonb_build_object(
    'monday', true,
    'tuesday', true,
    'wednesday', true,
    'thursday', true,
    'friday', true,
    'saturday', true
  ),
  'hours', jsonb_build_object(
    'monday', jsonb_build_object('start', '09:00', 'end', '18:00'),
    'tuesday', jsonb_build_object('start', '09:00', 'end', '18:00'),
    'wednesday', jsonb_build_object('start', '09:00', 'end', '18:00'),
    'thursday', jsonb_build_object('start', '09:00', 'end', '18:00'),
    'friday', jsonb_build_object('start', '09:00', 'end', '18:00'),
    'saturday', jsonb_build_object('start', '09:00', 'end', '13:00')
  ),
  'slotDurationMinutes', 60,
  'intervalMinutes', 0,
  'blockedDates', '[]'::jsonb,
  'blockedTimes', '[]'::jsonb
)
WHERE agenda_config IS NULL;
