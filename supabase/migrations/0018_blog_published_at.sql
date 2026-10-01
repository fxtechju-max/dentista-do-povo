-- Posts publicados sem data passam a usar a data de criação (o site só mostra
-- posts com data de publicação até agora — os futuros ficam agendados).
update blog_posts set published_at = created_at where status = 'publicado' and published_at is null;
