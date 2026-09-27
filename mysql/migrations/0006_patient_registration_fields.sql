alter table `patients`
  add column `cpf` varchar(20) after `email`,
  add column `birth_date` date after `cpf`,
  add column `address` text after `birth_date`,
  add column `guardian_name` text after `address`,
  add column `guardian_phone` varchar(30) after `guardian_name`,
  add column `guardian_cpf` varchar(20) after `guardian_phone`;
