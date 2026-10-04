-- Login com e-mail OU nome de usuário. O usuário é único (sem diferenciar
-- maiúsculas). Administradores atuais recebem como usuário a parte do e-mail
-- antes do "@", quando ela é válida e não se repete.
alter table users add column if not exists username varchar(40);
create unique index if not exists idx_users_username on users (lower(username)) where username is not null;

with c as (
  select id,
         lower(split_part(email, '@', 1)) as u,
         count(*) over (partition by lower(split_part(email, '@', 1))) as n
    from users
)
update users
   set username = c.u
  from c
 where users.id = c.id
   and users.username is null
   and c.n = 1
   and c.u ~ '^[a-z0-9][a-z0-9._-]{2,29}$';
