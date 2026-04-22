ARQUIVOS PRONTOS - TESTE ISOLADO DA BOLHA

Conteúdo:
- index.html
- bubble.css
- bubble-scene.js

Objetivo desta versão:
- testar só 1 bolha
- usar oitavas no volume orgânico da superfície
- puxar um reflexo mais forte e mais "liquid glass"
- ficar muito mais leve que um pós-processo full-screen pesado

Como aplicar:
1. Crie uma pasta nova para o teste.
2. Coloque os 3 arquivos nela.
3. Abra via servidor HTTP/HTTPS normal.
4. O arquivo principal é bubble-scene.js.

Controles:
- oitavas: quantidade de camadas no fbm da superfície
- volume orgânico: deslocamento da casca
- iridescência: força da película colorida
- reflexo: força dos highlights e da leitura especular

O que foi feito aqui:
- 1 esfera só
- shader próprio, sem solver de fluido
- volume gerado por fbm com até 6 oitavas
- reflexo reforçado com múltiplos highlights especulares inspirados no modelo liquid glass
- uma segunda casca interna leve para dar mais profundidade visual

Observação importante:
- esta versão é um laboratório visual
- a ideia é validar o visual da bolha antes de levar isso para a home inteira
