VERSÃO PREPARADA PARA LER DIRETO DO GITHUB

O site agora usa somente os arquivos .jpg da pasta:
site_links/artes

do repositório:
tiagosillos-art/gallery

Não existe mais lista fixa de imagens no código.
Não existe mais dependência de index.json.
Não existem mais aquelas fotos de URL fixas dentro da página.

COMO FUNCIONA
1. O script consulta a API pública do GitHub.
2. Lê tudo que for .jpg dentro de site_links/artes.
3. Carrega essas imagens automaticamente na galeria.

O QUE FOI AJUSTADO
- leitura apenas da pasta site_links/artes
- apenas arquivos .jpg
- sem limite de quantidade
- sem controle de velocidade por rollover/arrasto
- velocidade geral reduzida em 30%

SE QUISER TROCAR DE REPOSITÓRIO/PASTA
Edite o bloco GITHUB_CONFIG no início do arquivo script.js.
