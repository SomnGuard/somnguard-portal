import { endpoints, HTTP } from '../../../shared/api/endpoints';
import { httpRequest } from '../../../shared/api/client';

export type CatalogKey = 'event-categories' | 'event-types' | 'severities' | 'sound-patterns' | 'media-types';
export const listCatalogApi = (catalog: CatalogKey) => httpRequest<Record<string, unknown>[]>(endpoints.catalogs.list(catalog), HTTP.GET);
export const createCatalogItemApi = (catalog: CatalogKey, body: Record<string, unknown>) => httpRequest<Record<string, unknown>>(endpoints.catalogs.list(catalog), HTTP.POST, body);
export const updateCatalogItemApi = (catalog: CatalogKey, id: string, body: Record<string, unknown>) => httpRequest<Record<string, unknown>>(endpoints.catalogs.item(catalog, id), HTTP.PATCH, body);
export const deleteCatalogItemApi = (catalog: CatalogKey, id: string) => httpRequest<void>(endpoints.catalogs.item(catalog, id), HTTP.DELETE);
