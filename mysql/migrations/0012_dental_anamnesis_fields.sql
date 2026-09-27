alter table `patient_anamnesis`
  add column `chief_complaint` text after `patient_id`,
  add column `last_dental_visit_at` date after `chief_complaint`,
  add column `brushing_frequency` varchar(50) after `last_dental_visit_at`,
  add column `flosses_regularly` boolean not null default false after `brushing_frequency`,
  add column `bleeding_gums` boolean not null default false after `flosses_regularly`,
  add column `tooth_sensitivity` boolean not null default false after `bleeding_gums`,
  add column `bruxism` boolean not null default false after `tooth_sensitivity`,
  add column `uses_orthodontic_appliance` boolean not null default false after `bruxism`,
  add column `uses_dental_prosthesis` boolean not null default false after `uses_orthodontic_appliance`,
  add column `anesthesia_allergy` boolean not null default false after `uses_dental_prosthesis`;
