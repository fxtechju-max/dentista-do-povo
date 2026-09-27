-- MySQL 8.0.19+; UTC dates; explicit foreign keys and server-side authorization.
create table if not exists users (
  id char(36) primary key,
  email varchar(254) not null unique,
  password_hash varchar(255) null,
  created_at datetime(3) not null default current_timestamp(3)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
create table if not exists sessions (
  token_hash char(64) primary key,
  user_id char(36) not null,
  expires_at datetime(3) not null,
  foreign key (user_id) references users(id) on delete cascade,
  index idx_session_expiry (expires_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
create table if not exists rate_limits (
  bucket varchar(191) primary key,
  hits int not null default 1,
  expires_at datetime(3) not null,
  index idx_rate_expiry (expires_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `user_roles` (
  `id` char(36) primary key default (uuid()),
  `user_id` char(36)  not null,
  `role` enum('admin','user') not null,
  unique (user_id, role),
  foreign key (`user_id`) references `users`(`id`) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `conversations` (
  `id` char(36) primary key default (uuid()),
  `visitor_name` text not null,
  `created_at` datetime(3) not null default current_timestamp(3),
  `last_message_at` datetime(3) not null default current_timestamp(3),
  `visitor_token_hash` char(64) null,
  index idx_visitor_token (visitor_token_hash),
  index idx_last_message (last_message_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `messages` (
  `id` char(36) primary key default (uuid()),
  `conversation_id` char(36)  not null,
  `sender` varchar(191) not null check (sender in ('visitor', 'admin')),
  `content` text not null,
  `created_at` datetime(3) not null default current_timestamp(3),
  index idx_messages_conversation_date (conversation_id, created_at),
  foreign key (`conversation_id`) references `conversations`(`id`) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `patients` (
  `id` char(36) primary key default (uuid()),
  `name` text not null,
  `phone` text,
  `email` text,
  `created_at` datetime(3) not null default current_timestamp(3)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `appointments` (
  `id` char(36) primary key default (uuid()),
  `patient_id` char(36)  not null,
  `treatment` text not null,
  `scheduled_at` datetime(3) not null,
  `status` enum('agendado','confirmado','concluido','cancelado') not null default 'agendado',
  `created_at` datetime(3) not null default current_timestamp(3),
  index idx_appointments_date (scheduled_at),
  foreign key (`patient_id`) references `patients`(`id`) on delete restrict
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `payments` (
  `id` char(36) primary key default (uuid()),
  `patient_id` char(36) ,
  `appointment_id` char(36) ,
  `amount` numeric(10, 2) not null,
  `status` enum('pendente','pago','cancelado') not null default 'pendente',
  `paid_at` datetime(3),
  `created_at` datetime(3) not null default current_timestamp(3),
  index idx_payments_status_date (status, paid_at),
  check (amount >= 0),
  foreign key (`patient_id`) references `patients`(`id`) on delete restrict,
  foreign key (`appointment_id`) references `appointments`(`id`) on delete set null
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `leads` (
  `id` char(36) primary key default (uuid()),
  `name` text not null,
  `phone` text,
  `source` text,
  `status` enum('novo','em_contato','convertido','perdido') not null default 'novo',
  `created_at` datetime(3) not null default current_timestamp(3)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `treatments` (
  `id` char(36) primary key default (uuid()),
  `name` text not null,
  `description` text,
  `price` numeric(10, 2),
  `duration_minutes` integer,
  `active` boolean not null default true,
  `created_at` datetime(3) not null default current_timestamp(3)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `budgets` (
  `id` char(36) primary key default (uuid()),
  `patient_id` char(36)  not null,
  `treatment` text not null,
  `value` numeric(10, 2) not null,
  `status` varchar(191) not null default 'rascunho' check (status in ('rascunho', 'enviado', 'aprovado', 'recusado')),
  `notes` text,
  `created_at` datetime(3) not null default current_timestamp(3),
  check (value >= 0),
  foreign key (`patient_id`) references `patients`(`id`) on delete restrict
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `prescriptions` (
  `id` char(36) primary key default (uuid()),
  `patient_id` char(36)  not null,
  `medication` text not null,
  `instructions` text,
  `issued_at` datetime(3) not null default current_timestamp(3),
  `created_at` datetime(3) not null default current_timestamp(3),
  foreign key (`patient_id`) references `patients`(`id`) on delete restrict
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `documents` (
  `id` char(36) primary key default (uuid()),
  `patient_id` char(36) ,
  `title` text not null,
  `category` text,
  `url` text,
  `created_at` datetime(3) not null default current_timestamp(3),
  foreign key (`patient_id`) references `patients`(`id`) on delete restrict
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `whatsapp_contacts` (
  `id` char(36) primary key default (uuid()),
  `name` text not null,
  `phone` text not null,
  `last_message` text,
  `last_contact_at` datetime(3) not null default current_timestamp(3),
  `created_at` datetime(3) not null default current_timestamp(3)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `services` (
  `id` char(36) primary key default (uuid()),
  `name` text not null,
  `description` text,
  `price` numeric(10, 2),
  `active` boolean not null default true,
  `sort_order` integer not null default 0,
  `created_at` datetime(3) not null default current_timestamp(3)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `profiles` (
  `id` char(36) primary key ,
  `display_name` text,
  `created_at` datetime(3) not null default current_timestamp(3),
  foreign key (`id`) references `users`(`id`) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `clinic_settings` (
  `id` varchar(191) primary key default 'default',
  `clinic_name` text,
  `phone` text,
  `address` text,
  `updated_at` datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
  `ai_secretary_enabled` boolean not null default false,
  `disabled_modules` json not null default (json_array())
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `blog_posts` (
  `id` char(36) primary key default (uuid()),
  `title` text not null,
  `slug` varchar(191) not null unique,
  `excerpt` text,
  `content` text not null,
  `cover_image_url` text,
  `status` varchar(191) not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  `published_at` datetime(3),
  `created_at` datetime(3) not null default current_timestamp(3),
  `updated_at` datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
  `category` varchar(191) not null default 'Prevenção'
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `patient_anamnesis` (
  `patient_id` char(36) primary key ,
  `allergies` text,
  `current_medications` text,
  `systemic_conditions` text,
  `previous_surgeries` text,
  `is_smoker` boolean not null default false,
  `is_pregnant` boolean not null default false,
  `has_diabetes` boolean not null default false,
  `has_hypertension` boolean not null default false,
  `has_heart_condition` boolean not null default false,
  `additional_notes` text,
  `updated_at` datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
  foreign key (`patient_id`) references `patients`(`id`) on delete restrict
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `tooth_records` (
  `id` char(36) primary key default (uuid()),
  `patient_id` char(36)  not null,
  `tooth_number` smallint not null check (tooth_number between 11 and 48),
  `condition` varchar(191) not null default 'saudavel' check (
    `condition` in ('saudavel', 'carie', 'restaurado', 'ausente', 'canal', 'coroa', 'implante', 'fraturado')
  ),
  `notes` text,
  `updated_at` datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
  unique (patient_id, tooth_number),
  foreign key (`patient_id`) references `patients`(`id`) on delete restrict
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists `clinical_notes` (
  `id` char(36) primary key default (uuid()),
  `patient_id` char(36)  not null,
  `note` text not null,
  `created_at` datetime(3) not null default current_timestamp(3),
  foreign key (`patient_id`) references `patients`(`id`) on delete restrict
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
