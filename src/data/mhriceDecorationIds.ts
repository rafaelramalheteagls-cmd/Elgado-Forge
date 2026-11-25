import catalog from './generated/mhriceAppCatalog.json';

// MHRice stores IDs relative to the start of each game's enum range.
// https://github.com/wwylele/mhrice/blob/main/src/rsz/skill.rs#L446-L454
export const DECORATION_NAMES_BY_GAME_ID = new Map<number, string>([
  ...catalog.decorations.map(({ sourceId, id, name }): [number, string] =>
    [sourceId + (id.startsWith('mr-deco:') ? 109 : 1), name]
  ),
  ...catalog.rampageDecorations.map(({ sourceId, name }): [number, string] =>
    [sourceId + 0x00100001, name]
  ),
]);
