import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import {
  ARMOR_DB,
  DECORATIONS_DB,
  MONSTERS_DB,
  SKILLS_DB,
  WEAPONS_DB,
} from './src/data/sunbreakDb.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MHR_APP_ID = 1446780;
let lastDatabaseSyncAt = new Date().toISOString();

function extractXmlTag(xml: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return cdataMatch[1].trim();
  const plainRe = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
  const plainMatch = xml.match(plainRe);
  return plainMatch ? plainMatch[1].trim() : '';
}

function parseSteamInput(rawInput: string): {
  kind: 'id64' | 'vanity';
  value: string;
} | null {
  const input = rawInput.trim();
  if (!input || input.length > 200) return null;

  if (/^7656119\d{10}$/.test(input)) {
    return { kind: 'id64', value: input };
  }

  if (input.startsWith('http://') || input.startsWith('https://')) {
    try {
      const parsed = new URL(input);
      if (
        parsed.hostname !== 'steamcommunity.com' &&
        parsed.hostname !== 'www.steamcommunity.com'
      ) {
        return null;
      }
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments[0] === 'profiles' && /^7656119\d{10}$/.test(segments[1] ?? '')) {
        return { kind: 'id64', value: segments[1] };
      }
      if (segments[0] === 'id' && /^[a-zA-Z0-9_-]{2,64}$/.test(segments[1] ?? '')) {
        return { kind: 'vanity', value: segments[1] };
      }
      return null;
    } catch {
      return null;
    }
  }

  if (/^[a-zA-Z0-9_-]{2,64}$/.test(input)) {
    return { kind: 'vanity', value: input };
  }

  return null;
}

function calibrateProgressionFromSteam(
  playtimeHours: number,
  unlockedCount: number,
  unlockedLabels: string[]
): {
  estimatedHr: number;
  estimatedMr: number;
  estimatedAr: number;
  milestones: string[];
} {
  const joined = unlockedLabels.join(' ').toLowerCase();
  const milestones: string[] = [];

  let estimatedHr = 8;
  let estimatedMr = 0;
  let estimatedAr = 0;

  if (unlockedCount >= 10 || playtimeHours >= 20) {
    estimatedHr = Math.max(estimatedHr, 50);
    milestones.push('Kamura High Rank Cleared');
  }
  if (unlockedCount >= 25 || playtimeHours >= 60 || joined.includes('valstrax')) {
    estimatedHr = Math.max(estimatedHr, 100);
    milestones.push('HR 100 Crimson Glow Valstrax Unlocked');
  }
  if (
    unlockedCount >= 40 ||
    playtimeHours >= 80 ||
    joined.includes('elgado') ||
    joined.includes('sunbreak') ||
    joined.includes('master')
  ) {
    estimatedMr = Math.max(estimatedMr, 6);
    milestones.push('Elgado Master Rank Story Reached');
  }
  if (
    unlockedCount >= 60 ||
    playtimeHours >= 130 ||
    joined.includes('afflicted') ||
    joined.includes('anomaly')
  ) {
    estimatedMr = Math.max(estimatedMr, 30);
    estimatedAr = Math.max(estimatedAr, 50);
    milestones.push('Anomaly Investigations Active (MR 10+)');
  }
  if (
    unlockedCount >= 80 ||
    playtimeHours >= 220 ||
    joined.includes('scorned') ||
    joined.includes('risen')
  ) {
    estimatedMr = Math.max(estimatedMr, 120);
    estimatedAr = Math.max(estimatedAr, 131);
    milestones.push('Risen Elder & High Anomaly Tier (AR 131+)');
  }
  if (unlockedCount >= 92 || playtimeHours >= 350) {
    estimatedMr = Math.max(estimatedMr, 200);
    estimatedAr = Math.max(estimatedAr, 241);
    milestones.push('Special Investigation Endgame Ready');
  }

  if (milestones.length === 0) {
    milestones.push('Kamura Progression Calibrated');
  }

  return { estimatedHr, estimatedMr, estimatedAr, milestones };
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ElgadoForge-MHR-Workbench/1.0' },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function syncViaSteamWebApi(
  target: { kind: 'id64' | 'vanity'; value: string },
  apiKey: string
) {
  let steamId64 = target.value;

  if (target.kind === 'vanity') {
    const resolveUrl = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${encodeURIComponent(
      apiKey
    )}&vanityurl=${encodeURIComponent(target.value)}`;
    const resolveRes = await fetchWithTimeout(resolveUrl);
    if (!resolveRes.ok) {
      throw new Error('Steam vanity lookup failed.');
    }
    const resolveJson = (await resolveRes.json()) as {
      response?: { success?: number; steamid?: string };
    };
    if (resolveJson.response?.success !== 1 || !resolveJson.response.steamid) {
      throw new Error('Could not resolve Steam custom URL.');
    }
    steamId64 = resolveJson.response.steamid;
  }

  const summaryUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${encodeURIComponent(
    apiKey
  )}&steamids=${encodeURIComponent(steamId64)}`;
  const achUrl = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${encodeURIComponent(
    apiKey
  )}&steamid=${encodeURIComponent(steamId64)}&appid=${MHR_APP_ID}&l=english`;
  const gamesUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${encodeURIComponent(
    apiKey
  )}&steamid=${encodeURIComponent(steamId64)}&include_appinfo=1&appids_filter[0]=${MHR_APP_ID}`;

  const [sumRes, achRes, gamesRes] = await Promise.all([
    fetchWithTimeout(summaryUrl),
    fetchWithTimeout(achUrl),
    fetchWithTimeout(gamesUrl),
  ]);

  if (!sumRes.ok) {
    throw new Error('Steam profile summary request failed.');
  }

  const sumJson = (await sumRes.json()) as {
    response?: { players?: Array<{ personaname?: string; avatarfull?: string }> };
  };
  const player = sumJson.response?.players?.[0];
  if (!player) {
    throw new Error('Steam profile not found.');
  }

  let playtimeHours = 0;
  if (gamesRes.ok) {
    const gamesJson = (await gamesRes.json()) as {
      response?: { games?: Array<{ appid: number; playtime_forever?: number }> };
    };
    const mhr = gamesJson.response?.games?.find((g) => g.appid === MHR_APP_ID);
    if (mhr?.playtime_forever) {
      playtimeHours = Math.round((mhr.playtime_forever / 60) * 10) / 10;
    }
  }

  let achievementsUnlocked = 0;
  let achievementsTotal = 100;
  const unlockedLabels: string[] = [];

  if (achRes.ok) {
    const achJson = (await achRes.json()) as {
      playerstats?: {
        success?: boolean;
        achievements?: Array<{ apiname: string; achieved: number; name?: string }>;
      };
    };
    const list = achJson.playerstats?.achievements ?? [];
    if (list.length > 0) {
      achievementsTotal = list.length;
      const unlocked = list.filter((a) => a.achieved === 1);
      achievementsUnlocked = unlocked.length;
      for (const a of unlocked) {
        unlockedLabels.push(a.name ?? a.apiname);
      }
    }
  }

  const cal = calibrateProgressionFromSteam(
    playtimeHours,
    achievementsUnlocked,
    unlockedLabels
  );

  return {
    ok: true,
    source: 'steam-web-api' as const,
    steamId64,
    personaName: player.personaname ?? steamId64,
    avatarUrl: player.avatarfull ?? '',
    playtimeHours,
    achievementsUnlocked,
    achievementsTotal,
    ...cal,
  };
}

async function syncViaSteamCommunityXml(target: {
  kind: 'id64' | 'vanity';
  value: string;
}) {
  const basePath =
    target.kind === 'id64'
      ? `https://steamcommunity.com/profiles/${encodeURIComponent(target.value)}`
      : `https://steamcommunity.com/id/${encodeURIComponent(target.value)}`;

  const profileRes = await fetchWithTimeout(`${basePath}/?xml=1`);
  if (!profileRes.ok) {
    throw new Error('Could not reach Steam Community profile.');
  }
  const profileXml = await profileRes.text();
  if (profileXml.includes('<error>')) {
    throw new Error('Steam profile was not found or is set to private.');
  }

  const steamId64 = extractXmlTag(profileXml, 'steamID64') || target.value;
  const personaName = extractXmlTag(profileXml, 'steamID') || target.value;
  const avatarUrl = extractXmlTag(profileXml, 'avatarFull');
  const privacyState = extractXmlTag(profileXml, 'privacyState');

  let playtimeHours = 0;
  let achievementsUnlocked = 0;
  let achievementsTotal = 100;
  const unlockedLabels: string[] = [];
  let warning: string | undefined;

  if (privacyState && privacyState.toLowerCase() !== 'public') {
    warning = 'Steam profile privacy is restricted; set Game Details to Public for full achievement sync.';
  } else {
    const [achRes, gamesRes] = await Promise.all([
      fetchWithTimeout(`${basePath}/stats/${MHR_APP_ID}/achievements/?xml=1`),
      fetchWithTimeout(`${basePath}/games/?tab=all&xml=1`),
    ]);

    if (gamesRes.ok) {
      const gamesXml = await gamesRes.text();
      const mhrBlockMatch = gamesXml.match(
        /<game>\s*<appID>1446780<\/appID>[\s\S]*?<\/game>/i
      );
      if (mhrBlockMatch) {
        const hrsRaw = extractXmlTag(mhrBlockMatch[0], 'hoursOnRecord');
        const parsedHrs = Number(hrsRaw.replace(/,/g, ''));
        if (!Number.isNaN(parsedHrs)) playtimeHours = parsedHrs;
      }
    }

    if (achRes.ok) {
      const achXml = await achRes.text();
      const blocks = achXml.match(/<achievement\s+closed="([01])">[\s\S]*?<\/achievement>/gi) ?? [];
      if (blocks.length > 0) {
        achievementsTotal = blocks.length;
        for (const blk of blocks) {
          if (/^<achievement\s+closed="1">/i.test(blk)) {
            achievementsUnlocked++;
            const label = extractXmlTag(blk, 'name') || extractXmlTag(blk, 'apiname');
            if (label) unlockedLabels.push(label);
          }
        }
      }
    }

    if (achievementsUnlocked === 0 && playtimeHours === 0) {
      warning =
        'No public Monster Hunter Rise (AppID 1446780) game details were exposed for this profile.';
    }
  }

  const cal = calibrateProgressionFromSteam(
    playtimeHours,
    achievementsUnlocked,
    unlockedLabels
  );

  return {
    ok: true,
    source: 'steam-community-xml' as const,
    steamId64,
    personaName,
    avatarUrl,
    playtimeHours,
    achievementsUnlocked,
    achievementsTotal,
    ...cal,
    warning,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, app: 'Elgado Forge', mhrAppId: MHR_APP_ID });
  });

  // Official Curated Sunbreak Database Catalog API
  app.get('/api/database/catalog', (_req, res) => {
    res.json({
      ok: true,
      version: 'Sunbreak TU6 (Ver.16)',
      lastSyncedAt: lastDatabaseSyncAt,
      counts: {
        weapons: WEAPONS_DB.length,
        armor: ARMOR_DB.length,
        skills: SKILLS_DB.length,
        decorations: DECORATIONS_DB.length,
        monsters: MONSTERS_DB.length,
      },
    });
  });

  app.get('/api/database/search', (req, res) => {
    const type = String(req.query.type ?? 'weapons');
    const q = String(req.query.q ?? '').trim().toLowerCase();
    const skill = String(req.query.skill ?? '').trim();
    const rank = String(req.query.rank ?? '').trim();
    const weaponClass = String(req.query.weaponClass ?? '').trim();
    const slot = String(req.query.slot ?? '').trim();
    const species = String(req.query.species ?? '').trim();

    if (type === 'weapons') {
      const results = WEAPONS_DB.filter((w) => {
        if (weaponClass && w.weaponClass !== weaponClass) return false;
        if (
          q &&
          !w.name.toLowerCase().includes(q) &&
          !w.weaponClass.toLowerCase().includes(q) &&
          !w.unlockNote.toLowerCase().includes(q) &&
          !w.elementType.toLowerCase().includes(q)
        ) {
          return false;
        }
        if (rank && w.rankTier !== rank) return false;
        return true;
      });
      return res.json({ ok: true, type, results });
    }

    if (type === 'armor') {
      const results = ARMOR_DB.filter((a) => {
        if (slot && a.slot !== slot) return false;
        if (
          q &&
          !a.name.toLowerCase().includes(q) &&
          !a.slot.toLowerCase().includes(q) &&
          !a.unlockNote.toLowerCase().includes(q)
        ) {
          return false;
        }
        if (skill && !a.skills[skill]) return false;
        if (rank && a.rankTier !== rank) return false;
        return true;
      });
      return res.json({ ok: true, type, results });
    }

    if (type === 'decorations') {
      const results = DECORATIONS_DB.filter((d) => {
        if (q && !d.name.toLowerCase().includes(q)) return false;
        if (skill && d.skillId !== skill) return false;
        if (rank && d.rankTier !== rank) return false;
        return true;
      });
      return res.json({ ok: true, type, results });
    }

    if (type === 'skills') {
      const results = SKILLS_DB.filter(
        (s) =>
          (!q || s.name.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q)) &&
          (!skill || s.category === skill)
      );
      return res.json({ ok: true, type, results });
    }

    if (type === 'monsters') {
      const results = MONSTERS_DB.filter(
        (m) =>
          (!q ||
            m.name.toLowerCase().includes(q) ||
            m.species.toLowerCase().includes(q) ||
            m.primaryWeakness.toLowerCase().includes(q)) &&
          (!species || m.species === species)
      );
      return res.json({ ok: true, type, results });
    }

    return res.status(400).json({ ok: false, error: 'Unsupported database type.' });
  });

  app.post('/api/database/sync', (_req, res) => {
    lastDatabaseSyncAt = new Date().toISOString();
    res.json({
      ok: true,
      version: 'Sunbreak TU6 (Ver.16)',
      lastSyncedAt: lastDatabaseSyncAt,
      counts: {
        weapons: WEAPONS_DB.length,
        armor: ARMOR_DB.length,
        skills: SKILLS_DB.length,
        decorations: DECORATIONS_DB.length,
        monsters: MONSTERS_DB.length,
      },
    });
  });

  // Steam Progression & Achievement Sync (AppID 1446780)
  app.post('/api/steam/sync', async (req, res) => {
    const rawInput = typeof req.body?.steamInput === 'string' ? req.body.steamInput : '';
    const parsed = parseSteamInput(rawInput);

    if (!parsed) {
      return res.status(400).json({
        ok: false,
        error:
          'Enter a valid 17-digit SteamID64, Steam Vanity ID, or steamcommunity.com profile URL.',
      });
    }

    const steamApiKey = process.env.STEAM_API_KEY?.trim();

    try {
      const data = steamApiKey
        ? await syncViaSteamWebApi(parsed, steamApiKey)
        : await syncViaSteamCommunityXml(parsed);
      return res.json(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to synchronize Steam profile.';
      return res.status(502).json({ ok: false, error: message });
    }
  });

  // Real-time Inventory Synchronization check endpoint
  app.post('/api/inventory/sync', (req, res) => {
    const body = req.body ?? {};
    const mr = Math.max(0, Math.min(999, Number(body.mr) || 0));
    const ar = Math.max(0, Math.min(300, Number(body.ar) || 0));

    const unlockedWeapons = WEAPONS_DB.filter((w) => w.minMr <= mr && w.minAr <= ar).map(
      (w) => w.id
    );
    const unlockedArmor = ARMOR_DB.filter((a) => a.minMr <= mr && a.minAr <= ar).map(
      (a) => a.id
    );
    const unlockedDecos = DECORATIONS_DB.filter((d) => d.minMr <= mr).map((d) => d.id);

    res.json({
      ok: true,
      syncedAt: new Date().toISOString(),
      unlockedWeaponIds: unlockedWeapons,
      unlockedArmorIds: unlockedArmor,
      unlockedDecoIds: unlockedDecos,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Elgado Forge server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
