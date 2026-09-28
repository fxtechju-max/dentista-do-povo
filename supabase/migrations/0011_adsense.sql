-- Google AdSense configurado pela área restrita (Configurações › Anúncios).
-- O /ads.txt é gerado a partir de adsense_client_id (ver src/server.ts).
alter table clinic_settings add column if not exists adsense_enabled boolean not null default false;
alter table clinic_settings add column if not exists adsense_client_id text;
alter table clinic_settings add column if not exists adsense_slot_home text;
alter table clinic_settings add column if not exists adsense_slot_blog_list text;
alter table clinic_settings add column if not exists adsense_slot_blog_post text;
alter table clinic_settings add column if not exists ads_txt_extra text;
