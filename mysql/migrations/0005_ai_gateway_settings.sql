-- Never added to tableColumns (src/integrations/mysql/tables.ts) on purpose: the
-- generic query builder must never be able to select or return ai_gateway_api_key
-- to a browser. Only dedicated server functions (getAiGatewaySettings /
-- saveAiGatewaySettings) touch these columns, and the API key is never read back.
alter table `clinic_settings`
  add column `ai_gateway_provider` varchar(191) after `whatsapp_number`,
  add column `ai_gateway_base_url` text after `ai_gateway_provider`,
  add column `ai_gateway_model` varchar(191) after `ai_gateway_base_url`,
  add column `ai_gateway_api_key` text after `ai_gateway_model`;
