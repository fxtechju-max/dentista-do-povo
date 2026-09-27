-- Replaces the single `condition` enum with a JSON array of conditions (a
-- tooth can have several findings at once, e.g. "restaurado" + "cariado"),
-- and widens the tooth_number range to also allow deciduous teeth (FDI 51-85).
alter table `tooth_records` drop check `tooth_records_chk_1`;
alter table `tooth_records`
  add check (`tooth_number` between 11 and 48 or `tooth_number` between 51 and 85);

alter table `tooth_records` add column `conditions` json not null after `tooth_number`;

update `tooth_records` set `conditions` = json_array(`condition`) where `condition` <> 'saudavel';
update `tooth_records` set `conditions` = json_array('higido') where `condition` = 'saudavel';

alter table `tooth_records` drop check `tooth_records_chk_2`;
alter table `tooth_records` drop column `condition`;
