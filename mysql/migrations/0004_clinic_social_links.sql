alter table `clinic_settings`
  add column `instagram_url` text after `address`,
  add column `facebook_url` text after `instagram_url`,
  add column `whatsapp_number` text after `facebook_url`;
