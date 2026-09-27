create table if not exists `finance_entries` (
  `id` char(36) primary key default (uuid()),
  `type` enum('pagar','receber') not null,
  `description` text not null,
  `category` text,
  `amount` numeric(10, 2) not null,
  `due_date` date,
  `paid_at` datetime(3),
  `status` enum('pendente','pago','cancelado') not null default 'pendente',
  `patient_id` char(36),
  `notes` text,
  `created_at` datetime(3) not null default current_timestamp(3),
  index idx_finance_entries_type_status (type, status),
  index idx_finance_entries_due_date (due_date),
  check (amount >= 0),
  foreign key (`patient_id`) references `patients`(`id`) on delete set null
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
