-- Preferências da interface gravadas como texto JSON dentro do jsonb
-- ("{\"mode\":...}") viram objeto JSON de verdade, para serem lidas de volta.
update preferences
set value = (value #>> '{}')::jsonb
where jsonb_typeof(value) = 'string';
