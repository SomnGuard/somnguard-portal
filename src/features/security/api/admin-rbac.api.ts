import { endpoints, HTTP } from '../../../shared/api/endpoints';
import { httpRequest } from '../../../shared/api/client';

export interface Role { id: string; code: string; name: string; description?: string; isActive?: boolean }
export interface Feature { id: string; moduleId: string; code: string; name: string; description?: string }
export interface AdminModule { id: string; code: string; name: string; description?: string }

export const listRolesAdminApi = () => httpRequest<Role[]>(endpoints.admin.roles, HTTP.GET);
export const createRoleAdminApi = (body: { code: string; name: string; description?: string }) => httpRequest<Role>(endpoints.admin.roles, HTTP.POST, body);
export const updateRoleAdminApi = (id: string, body: { code: string; name: string; description?: string }) => httpRequest<Role>(endpoints.admin.role(id), HTTP.PUT, body);
export const deleteRoleAdminApi = (id: string) => httpRequest<void>(endpoints.admin.role(id), HTTP.DELETE);
export const listFeaturesAdminApi = () => httpRequest<Feature[]>(endpoints.admin.features, HTTP.GET);
export const createFeatureAdminApi = (body: { moduleId: string; code: string; name: string; description?: string }) => httpRequest<Feature>(endpoints.admin.features, HTTP.POST, body);
export const updateFeatureAdminApi = (id: string, body: { moduleId: string; code: string; name: string; description?: string }) => httpRequest<Feature>(endpoints.admin.feature(id), HTTP.PUT, body);
export const deleteFeatureAdminApi = (id: string) => httpRequest<void>(endpoints.admin.feature(id), HTTP.DELETE);
export const listModulesAdminApi = () => httpRequest<AdminModule[]>(endpoints.admin.modules, HTTP.GET);
export const listModuleFeaturesAdminApi = (id: string) => httpRequest<Feature[]>(endpoints.admin.moduleFeatures(id), HTTP.GET);
export const assignRoleFeatureAdminApi = (roleId: string, featureId: string) => httpRequest<Record<string, unknown>>(endpoints.admin.roleFeatures, HTTP.POST, { roleId, featureId });
export const removeRoleFeatureAdminApi = (id: string) => httpRequest<void>(endpoints.admin.roleFeature(id), HTTP.DELETE);
export const assignUserRoleAdminApi = (userId: string, roleId: string) => httpRequest<Record<string, unknown>>(endpoints.admin.userRoles(userId), HTTP.POST, { roleId });
export const removeUserRoleAdminApi = (userId: string, roleId: string) => httpRequest<void>(endpoints.admin.userRole(userId, roleId), HTTP.DELETE);
