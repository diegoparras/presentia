# Colaboración: estado actual y plan para co-edición CRDT (Yjs)

## Qué ya está hecho y funcionando (0.17.0 – 0.18.0)

La colaboración está construida **dentro del mismo proceso FastAPI**, sin infraestructura
externa, así que entra en la imagen Docker única.

- **Presencia en vivo**: sala WebSocket (`/api/v1/ppt/collab/ws/{id}`) que emite quién está
  conectado. Avatares en el header.
- **Comentarios**: persistidos (tabla `comments`), anclados a slide o al deck, resolver/borrar,
  con fan-out en vivo a la sala.
- **Historial de versiones**: snapshots (tabla `presentation_versions`) — guardar / listar /
  restaurar. El restore guarda una copia previa (es reversible) y reconstruye slides + título +
  tema. Verificado con round-trip exacto.
- **Sync no-destructivo**: cuando alguien restaura o guarda, la sala emite `doc_updated` y los
  demás editores muestran un banner **"otro usuario actualizó — Actualizar"** en vez de pisar
  ediciones locales silenciosamente.

Todo esto está testeado a nivel lógico (CRUD + broadcast + snapshot/restore con SQLite en memoria)
y no toca el modelo de datos del editor: es aditivo y seguro.

## Lo que falta: co-edición carácter-a-carácter (CRDT / Yjs)

Es decir, dos personas escribiendo en el **mismo texto a la vez** y viendo las teclas del otro en
tiempo real, con merge automático sin conflictos. Eso requiere un CRDT (Yjs). **No** se hizo aún
porque:

1. Suma dependencias pesadas nuevas — front `yjs` + `y-websocket` + `y-protocols`; back `pycrdt` +
   `pycrdt-websocket` (wheel con binario Rust).
2. Requiere un binding **Redux ↔ Y.Doc** del estado de slides, que es delicado (guardas de eco
   para no loopear, reconciliación con el editor Tiptap existente).
3. No se puede validar multi-cliente ni buildear el bundle en el sandbox actual → shipearlo a
   ciegas arriesga romper `npm run build` (y con eso, toda la imagen).

## Plan concreto para cuando se implemente (local, donde `npm install` corre)

### Backend (mismo proceso, sin broker externo)
1. `pip/uv add pycrdt pycrdt-websocket` en `servers/fastapi/pyproject.toml`.
2. Nuevo WS `/api/v1/ppt/collab/ydoc/{presentation_id}` que hostea un `YDoc` por presentación con
   `pycrdt_websocket.ASGIServer` / `WebsocketServer`. Persistir el estado del YDoc en
   `presentation_versions` o una tabla `ydoc_state(presentation_id, update BLOB)` cada N segundos /
   on-idle. Reusar `RoomManager` para awareness (cursores).
3. Al desconectarse el último peer, snapshotear el YDoc → escribir slides al modelo SQL para que
   los que abren sin colaboración vean el estado final (bridge CRDT→SQL).

### Frontend (detrás de un flag `NEXT_PUBLIC_COLLAB_CRDT`, default OFF)
1. `npm i yjs y-websocket y-protocols` (+ `y-prosemirror` para atar Tiptap).
2. Crear un `Y.Doc` por presentación; `WebsocketProvider` al endpoint del punto 2.
3. **Texto**: cada editor Tiptap usa `y-prosemirror` (`ySyncPlugin` + `yCursorPlugin`) atado a un
   `Y.XmlFragment` por campo de texto → co-edición real + cursores remotos.
4. **Estructura** (orden/alta/baja de slides, bloques del canvas): `Y.Array`/`Y.Map`; un efecto
   observa el YDoc y despacha a Redux con guarda de eco, y viceversa.
5. Activar **solo** si el flag está en `true`; con el flag OFF el editor funciona exactamente como
   hoy (autosave + banner de refresh). Así el rollout es incremental y no rompe nada.

### Verificación
- Dos navegadores en la misma presentación escribiendo en el mismo bloque → ver las teclas del
  otro y cursores; cerrar y reabrir → estado persistido correcto.
- Flag OFF → build y editor idénticos a 0.18.0 (regresión cero).

## Nota de release
El build de la imagen `:0.16.0` fue cancelado por el `concurrency` group del workflow (al pushear
varias `release/*` seguidas, GitHub conserva sólo el último run en cola y cancela los intermedios).
No se perdió ninguna feature: el código de 0.16.0 (video + transiciones) está incluido en `:0.17.0`
y `:0.18.0`. Para rollback usar `:0.15.0` (canvas+charts), `:0.17.0` (+colaboración) o `:0.18.0`.
Para evitarlo a futuro: pushear las `release/*` de a una, esperando que termine el build anterior.
