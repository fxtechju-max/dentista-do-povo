-- image_data is never added to tableColumns (src/integrations/mysql/tables.ts):
-- the generic query builder must never pull a multi-megabyte blob into a JSON
-- response. Only src/lib/gallery.functions.ts (admin upload/delete, raw pool
-- access) and src/server.ts (public image byte-serving) touch that column.
create table if not exists `gallery_photos` (
  `id` char(36) primary key default (uuid()),
  `title` text,
  `mime_type` varchar(100) not null,
  `width` int not null,
  `height` int not null,
  `byte_size` int not null,
  `sort_order` int not null default 0,
  `image_data` longblob not null,
  `created_at` datetime(3) not null default current_timestamp(3),
  index idx_gallery_sort (sort_order, created_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
