/// <reference types="node" />
import type { IncomingMessage, ServerResponse, Server } from 'node:http';

/** png, gif and apng come back as a Buffer; svg as a string. */
export type Format = 'png' | 'svg' | 'gif' | 'apng';

export type Theme = 'dark' | 'light' | 'black' | 'midnight' | 'graphite' | 'paper' | 'violet' | 'custom';
/** A product accent, or any #rrggbb colour. */
export type Accent = 'cartiqo' | 'store' | 'chat' | 'club' | 'mail' | 'forum' | 'wiki' | 'review' | 'labs' | (string & {});
export type Pattern = 'grid' | 'dots' | 'crosses' | 'lines' | 'diagonal' | 'none';
export type Animation =
  | 'none' | 'draw' | 'rise' | 'drop' | 'slide' | 'pop' | 'fade' | 'blur' | 'type' | 'flicker' | 'wave' | 'pulse';
export type Preset =
  | 'github' | 'github-social' | 'og' | 'x' | 'linkedin' | 'youtube' | 'discord-server' | 'discord-invite'
  | 'discord-profile' | 'discord-embed' | 'email' | 'square' | 'story';
/** A web address, a file path, a data: URL or the bytes of a PNG, JPEG, GIF or SVG. */
export type Picture = string | Buffer | Uint8Array;

interface Output {
  /** What to make. Default png. */
  format?: Format;
  /** Pixel density for png, gif and apng: 2 makes a 2× image. 0.25 to 4, default 1. */
  scale?: number;
  /** Frames a second for gif and apng. Default 25. */
  fps?: number;
}

interface Look {
  theme?: Theme;
  /** Background colour for the custom theme. */
  bg?: string;
  /** Text colour for the custom theme. */
  ink?: string;
  /** The dot's colour (and the glow's). Default cartiqo. */
  accent?: Accent;
}

interface Motion {
  animate?: Animation;
  /** Seconds for one loop. Default 4. */
  duration?: number;
  /** false plays once and stops on the finished look. Default true. */
  loop?: boolean;
  order?: 'ltr' | 'rtl' | 'centre' | 'edges' | 'random';
  /** 0 moves every letter together, 1 strictly one after another. Default: the animation's own. */
  stagger?: number;
  easing?: 'smooth' | 'snappy' | 'springy' | 'linear';
  /** How the loop ends. Default together. */
  exit?: 'together' | 'reverse';
  /** How far things move. Default 1. */
  intensity?: number;
}

interface Background {
  fill?: 'solid' | 'gradient' | 'glow' | 'image';
  /** Where the gradient fades to. Default: a mix of the background and the accent. */
  bg2?: string;
  /** Gradient direction in degrees, 0 is upwards. Default 135. */
  angle?: number;
  /** Glow strength, 0 to 1. Default 0.35. */
  glow?: number;
  glowAt?: 'centre' | 'top' | 'bottom' | 'left' | 'right';
  /** A background picture. Setting it turns fill to image. */
  image?: Picture;
  /** How much the theme colour darkens the picture, 0 to 1. Default 0.6. */
  dim?: number;
  /** Picture blur in pixels. Default 0. */
  blur?: number;
  pattern?: Pattern;
  patternSize?: number;
  patternStrength?: number;
  /** Film grain, 0 to 1. Default 0. */
  grain?: number;
}

export interface BannerOptions extends Output, Look, Motion, Background {
  /** A standard size by name, e.g. 'github' (1280 × 360, the default) or 'discord-server'. */
  preset?: Preset;
  width?: number;
  height?: number;
  /** A–Z, 0–9, space and . - / ! ' #. A full stop becomes the accent dot. Default CARTIQO. */
  wordmark?: string;
  overline?: string;
  motto?: string;
  font?: 'sans' | 'mono' | 'serif';
  caps?: boolean;
  align?: 'left' | 'center' | 'right';
  /** How big the content is. Default 1. */
  contentSize?: number;
  /** Wordmark stroke weight. Default 4. */
  weight?: number;
  /** Extra space between wordmark letters. Default 0. */
  tracking?: number;
  corners?: boolean;
  rule?: boolean;
  border?: boolean;
  animateLines?: boolean;
  animateRule?: boolean;
  animateCorners?: boolean;
}

export interface LogoOptions extends Output, Look, Motion {
  /** wordmark: the wordmark alone. icon: a short mark on a tile. lockup: the wordmark with its two lines. */
  type?: 'wordmark' | 'icon' | 'lockup';
  wordmark?: string;
  /** What an icon shows. Default C. */
  mark?: string;
  overline?: string;
  motto?: string;
  font?: 'sans' | 'mono' | 'serif';
  caps?: boolean;
  background?: 'none' | 'solid' | 'gradient';
  bg2?: string;
  angle?: number;
  shape?: 'square' | 'rounded' | 'circle';
  /** Corner radius as a share of the shorter side, 0 to 0.5. Default 0.22. */
  radius?: number;
  /** Space around the logo as a share of its height, 0 to 0.45. Default 0.12. */
  padding?: number;
  /** Height in pixels, and the width of an icon. Default 256. */
  size?: number;
  pattern?: Pattern;
  patternSize?: number;
  patternStrength?: number;
  grain?: number;
  weight?: number;
  tracking?: number;
  rule?: boolean;
  animateLines?: boolean;
  animateRule?: boolean;
}

export interface RankCardOptions extends Output, Look, Background {
  /** Shown big. Long names are shortened with …. */
  username?: string;
  /** A second line, e.g. the server's name. */
  subtitle?: string;
  /** Discord avatar links work as they are; they are fetched as PNG. */
  avatar?: Picture;
  status?: 'none' | 'online' | 'idle' | 'dnd' | 'streaming' | 'offline';
  level?: number;
  /** Place on the leaderboard. 0 leaves it out. */
  rank?: number;
  /** XP earned towards the next level. */
  xp?: number;
  /** XP the current level needs in all. */
  xpNeeded?: number;
  border?: boolean;
  /** Corner radius in pixels. Default 24. */
  radius?: number;
  /** Stroke weight of the big numbers. Default 4. */
  weight?: number;
  /** A small CARTIQO. in the corner. Default false. */
  watermark?: boolean;
  /** fill: the XP bar fills up. Default none. */
  animate?: 'none' | 'fill';
  duration?: number;
  loop?: boolean;
}

type Result<O> = O extends { format: 'svg' } ? string : Buffer;

export function banner<O extends BannerOptions>(options?: O): Promise<Result<O>>;
export function logo<O extends LogoOptions>(options?: O): Promise<Result<O>>;
export function rankCard<O extends RankCardOptions>(options?: O): Promise<Result<O>>;
export function make(kind: 'banner' | 'logo' | 'rank-card', options?: object, context?: { strict?: boolean; allowHosts?: string[] | '*' | null; allowFiles?: boolean }): Promise<Buffer | string>;

export interface HandlerSettings {
  /** Where the API is mounted, e.g. '/brand'. Default ''. */
  basePath?: string;
  /** Hosts avatars and background pictures may come from. Default Discord's CDN. '*' allows any. */
  allowImageHosts?: string[] | '*';
  /** How long browsers and CDNs may keep an image. Default 86400 (a day). */
  cacheSeconds?: number;
  /** Let any website load the images. Default true. */
  cors?: boolean;
  /** Largest JSON body a POST may send. Default 1 MB. */
  maxBodyBytes?: number;
}

/** Works with Node's http, Express (app.use) and Fastify (via reply.raw). Calls next() for other addresses. */
export function createHandler(settings?: HandlerSettings): (req: IncomingMessage, res: ServerResponse, next?: () => void) => void;
export function createServer(settings?: HandlerSettings): Server;

/** A mistake in the options. Its message is written for people. */
export class BrandError extends Error {}

export const presets: Preset[];
export const themes: Theme[];
export const accents: string[];
export const animations: Animation[];
export const patterns: Pattern[];
export const statuses: string[];
export const formats: Format[];
/** The renderer itself: options in, SVG out, nothing fetched. */
export const render: {
  banner(options?: object): string;
  logo(options?: object): string;
  rankCard(options?: object): string;
};

declare const brand: {
  banner: typeof banner; logo: typeof logo; rankCard: typeof rankCard; make: typeof make;
  createHandler: typeof createHandler; createServer: typeof createServer; BrandError: typeof BrandError;
  presets: Preset[]; themes: Theme[]; accents: string[]; animations: Animation[]; patterns: Pattern[];
  statuses: string[]; formats: Format[]; render: typeof render;
};
export default brand;
