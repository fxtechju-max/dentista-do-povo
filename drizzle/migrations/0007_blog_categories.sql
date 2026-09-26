-- Categorize the blog so the public page and the CMS can filter by topic.
alter table public.blog_posts
  add column category text not null default 'Prevenção';

update public.blog_posts set category = 'Prevenção' where slug in (
  'como-escovar-os-dentes-corretamente',
  'fio-dental-por-que-e-indispensavel',
  'sinais-de-que-voce-precisa-ir-ao-dentista',
  'alimentos-que-prejudicam-os-dentes',
  'alimentos-que-fortalecem-os-dentes',
  'gengivite-e-periodontite-como-prevenir',
  'halitose-mau-halito-causas-e-solucoes',
  'sensibilidade-dentaria-por-que-acontece',
  'como-escolher-a-escova-de-dente-ideal',
  'visitas-regulares-ao-dentista-qual-a-frequencia-ideal'
);

update public.blog_posts set category = 'Tratamentos' where slug in (
  'clareamento-dental-mitos-e-verdades',
  'bruxismo-causas-sintomas-e-tratamento',
  'implante-dentario-tudo-que-voce-precisa-saber',
  'aparelho-ortodontico-tipos-e-como-escolher',
  'tratamento-de-canal-mitos-e-verdades',
  'extracao-do-dente-do-siso-quando-e-necessaria',
  'protese-dentaria-tipos-e-cuidados'
);

update public.blog_posts set category = 'Fases da Vida' where slug in (
  'cuidados-com-a-saude-bucal-infantil',
  'saude-bucal-na-gravidez',
  'cuidados-bucais-para-idosos'
);
