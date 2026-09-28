-- Preferências da interface passam a ser do projeto (owner = 'clinic'), não
-- de cada pessoa/navegador. Aproveita a escolha mais recente feita por um
-- administrador para cada item (tema, zoom, modo de visualização).
insert into preferences (owner, key, value, updated_at)
select distinct on (key) 'clinic', key, value, updated_at
from preferences
where owner like 'user:%'
order by key, updated_at desc
on conflict (owner, key) do nothing;

-- Registros por pessoa/visitante não são mais usados.
delete from preferences where owner <> 'clinic';
