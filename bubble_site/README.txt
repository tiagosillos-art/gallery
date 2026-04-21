Arquivos do site:

- index.html
- bubble.css
- bubble-scene.js

Como usar:
1. Suba os 3 arquivos na mesma pasta do seu site.
2. Abra o index.html para testar.
3. Em produção, sirva por HTTP/HTTPS normal.
4. O arquivo bubble-scene.js importa Three.js por URL externa (esm.sh).

Se você quiser integrar isso dentro de uma página existente:
- copie o conteúdo do body de index.html para a sua página
- mantenha o link para bubble.css
- mantenha o script type="module" para bubble-scene.js

Observação:
- O áudio só começa depois de clique/toque/tecla, por regra do navegador.
- Ao ativar, toca um tom curto para confirmar que saiu som.
