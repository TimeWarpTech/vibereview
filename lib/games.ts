import rawGames from "@/games.json";
import { slugForGame } from "./slug";

export type YesNo = "Yes" | "No" | string;

export type Game = {
  year: string;
  game_url: string;
  game_host: string;
  game_name: string;
  pitch: string;
  genre: string;
  inspiration: string;
  x_username: string;
  screenshot: string;
  has_portal: YesNo;
  is_up: number;
  ai_written: YesNo;
  free_web_accessible: YesNo;
  mobile_ready: YesNo;
  multiplayer: YesNo;
  no_loading_screens: YesNo;
  engine: string;
  made_with: string;
  timestamp: string;
};

export const games: Game[] = rawGames as Game[];

export const gamesByUrl: Map<string, Game> = new Map(
  games.map((g) => [g.game_url, g]),
);

export const gamesBySlug: Map<string, Game> = new Map(
  games.map((g) => [slugForGame(g), g]),
);

export function getGameBySlug(slug: string): Game | undefined {
  return gamesBySlug.get(slug);
}

export function getGameByUrl(url: string): Game | undefined {
  return gamesByUrl.get(url);
}
