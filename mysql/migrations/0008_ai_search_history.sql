create table if not exists `ai_search_history` (
  `id` char(36) primary key default (uuid()),
  `question` text not null,
  `answer` text not null,
  `created_at` datetime(3) not null default current_timestamp(3),
  index idx_ai_history_date (created_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
