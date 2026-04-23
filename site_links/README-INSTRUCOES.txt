O problema real:
GitHub Pages não lista automaticamente os arquivos de uma pasta no navegador.
Então o site não consegue “adivinhar” sozinho quais JPGs existem em /site_links/artes/.

Solução que deixei pronta:
1) Você joga os JPGs na pasta:
   site_links/artes/

2) O workflow do GitHub gera automaticamente:
   site_links/artes/index.json

3) A galeria lê esse index.json e carrega todos os JPGs encontrados.

O que já foi feito:
- removidas URLs fixas de imagens do código
- agora o site depende só da pasta de artes + index.json
- velocidade geral 30% menor
- removido controle de velocidade por rollover/arrasto
- leitura apenas de arquivos .jpg

Importante:
- o arquivo index.json precisa existir no deploy
- se estiver usando GitHub Pages, o workflow incluso gera isso no push
- se quiser testar localmente sem Actions, rode:

  node tools/build-artes-index.mjs

Estrutura esperada:
/
  index.html
  style.css
  script.js
  site_links/
    artes/
      01.jpg
      02.jpg
      03.jpg
      index.json
  .github/
    workflows/
      build-artes-index.yml
  tools/
    build-artes-index.mjs

Se o seu index.html estiver em outra pasta, ajuste os caminhos candidatos no topo do script.js.
