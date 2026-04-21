Arquivos prontos para aplicar:
- index.html
- bubble.css
- bubble-scene.js

Como aplicar:
1. Substitua os arquivos atuais por estes 3 arquivos na mesma pasta do site.
2. Sirva a pasta por HTTP/HTTPS normal.
3. O bubble-scene.js usa Three.js por URL externa (esm.sh).

O que entrou nesta versão:
- flow-field leve offscreen embutido como textura dinâmica
- leitura desse flow-field dentro do shader de cada bolha
- resposta a mouse, colisões entre bolhas e impacto na parede
- redução adicional de custo: menos partículas, pixel ratio menor, menos segmentos e menos recomputação de normais

Resumo técnico:
- não usa solver full-screen pesado
- não cria 1 sistema de fluido por bolha
- usa 1 mapa de fluxo pequeno compartilhado, só para enriquecer película, brilho e variação orgânica

Observações:
- o áudio só começa depois de clique/toque/tecla, por regra do navegador
- esta versão foi validada com checagem sintática do JS
- ajuste fino visual ainda pode ser feito depois de testar no navegador real
