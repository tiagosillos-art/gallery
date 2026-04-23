ARQUIVOS PRONTOS PARA TESTE NO SITE

O que foi alterado:
- a galeria agora tenta listar automaticamente todos os arquivos .jpg desta pasta:
  https://tiagosillos.art.br/site_links/artes/
- sem limite fixo de quantidade
- removido o controle de velocidade por rollover/arrasto horizontal
- velocidade geral reduzida em 30%

IMPORTANTE
- para funcionar, essa URL precisa devolver uma listagem pública dos arquivos da pasta
- se o servidor não listar a pasta, o navegador não consegue descobrir sozinho quais JPGs existem
- o Three.js continua sendo carregado por CDN

Arquivo para ajustar depois, se quiser:
- script.js
  constante: IMAGE_DIRECTORY_URL
