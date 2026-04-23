VERSÃO MAIS ESTÁVEL PARA ONLINE

Essa versão não depende de api.github.com nem de raw.githubusercontent.com.
Ela lê apenas o arquivo local:
./artes/index.json

Fluxo:
1) coloque seus .jpg dentro da pasta artes
2) gere/atualize o artes/index.json
3) suba tudo para o site

Gerar index.json no Windows PowerShell:
./tools/build-artes-index.ps1

Gerar index.json com Node:
node ./tools/build-artes-index.mjs
