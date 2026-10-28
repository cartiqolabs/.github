// ES module entry: import { banner, logo, rankCard } from 'cartiqo-brand';
import brand from './index.js';

export const { banner, logo, rankCard, make, BrandError, presets, themes, accents, animations, patterns, statuses, formats, render } = brand;
export const createHandler = (settings) => brand.createHandler(settings);
export const createServer = (settings) => brand.createServer(settings);
export default brand;
