-- Google AdSense da clínica: ID de editor ca-pub-1471215282419135.
-- Só preenche se ainda não houver um ID salvo (não sobrescreve o painel).
update clinic_settings
set adsense_client_id = 'ca-pub-1471215282419135',
    adsense_enabled = true
where id = 'default'
  and coalesce(adsense_client_id, '') = '';
