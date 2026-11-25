# Elgado Forge

Elgado Forge is a build planner for Monster Hunter Rise: Sunbreak. It can import a REFramework inventory export, recommend sets using the equipment and materials in your box, and compare builds in an estimated combat simulator.

## Local setup

Use Node.js 24 and npm. Install dependencies and start the development server.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The builder and local inventory import require no API key. Optional Steam Web API access uses `STEAM_API_KEY` from a local `.env` file. See [the environment example](.env.example).

To run the production build locally, run `npm run build` followed by `npm start`.

## Verify the project

```sh
npm test
npm run lint
npm run build
npm run data:validate
```

Database validation and rebuilding require Python 3. The equipment and skill catalogs are derived from [MHRice](https://github.com/wwylele/mhrice). See [DATA_REBUILD.md](DATA_REBUILD.md) for source attribution, catalog coverage, and rebuild instructions.
