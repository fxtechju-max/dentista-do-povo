alter table `documents`
  add column `prescription_id` char(36) after `patient_id`,
  add foreign key (`prescription_id`) references `prescriptions`(`id`) on delete cascade;
