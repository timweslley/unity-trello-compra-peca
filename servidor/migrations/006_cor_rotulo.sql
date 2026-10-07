-- 07/10/2026: leituras guardadas pelo código do formulário (VD_ANX3_<anexo>) em que a cor saiu como nome de campo
-- ("CHASSI", da versão 'layout' do texto). Apagadas para o anexo ser lido de novo com a escolha corrigida.
DELETE FROM gas_propriedade
 WHERE chave LIKE 'VD\_ANX3\_%'
   AND valor ~ '"cor":"(CHASSI|PLACA|KM|QUILOMETRAGEM|COMBUSTIVEL|MODELO|MARCA|ANO|FABRICACAO|MOTOR|RENAVAM|CLIENTE|OFICINA|VERSAO)"';
