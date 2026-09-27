create table if not exists `audit_log` (
  `id` char(36) primary key default (uuid()),
  `user_id` char(36),
  `action` enum('insert','update','delete') not null,
  `table_name` varchar(191) not null,
  `record_id` varchar(191),
  `record_label` text,
  `created_at` datetime(3) not null default current_timestamp(3),
  index idx_audit_date (created_at),
  foreign key (`user_id`) references `users`(`id`) on delete set null
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
