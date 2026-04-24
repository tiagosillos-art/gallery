Versão pronta com bolhas no meio das camadas.

Estrutura visual:
- telas de fundo
- bolhas no meio
- telas de frente

Arquivos principais:
- index.html
- style.css
- script.js

As imagens continuam sendo carregadas por links diretos públicos definidos em script.js.


Atualizado: carregamento com timeout por imagem para evitar travar em 'Carregando imagens...'.


Correção aplicada: removido o fundo da página/parallax. As bolhas foram mantidas sem alteração no shader.


Ajuste aplicado: correção de color management apenas nos renderizadores das telas.


Ajuste aplicado: restaurado o fundo original azul-escuro das bolhas no layout, sem alterar o shader das bolhas.


Ajuste aplicado: renderer das bolhas adaptado para Three.js r128 usando outputEncoding e NoToneMapping.


Ajuste aplicado: escala individual por arquivo.
Arquivo para editar:
- script.js

Bloco para ajustar:
- const ARTES_SIZE_OVERRIDES = { ... }

Exemplos:
- 1.0 = tamanho base
- 1.2 = 20% maior
- 0.8 = 20% menor
