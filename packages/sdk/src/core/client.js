"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LitebaseClient = void 0;
const request_1 = require("../utils/request");
const query_builder_1 = require("./query-builder");
const subscription_manager_1 = require("./subscription-manager");
class LitebaseClient {
    constructor(config) {
        this.request = new request_1.RequestClient(config);
        this.projectId = config.projectId;
        this.subscriptionManager = new subscription_manager_1.SubscriptionManager(config.baseUrl || 'http://localhost:3000', config.apiKey, config.projectId || '');
    }
    // Real-time Subscriptions
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.subscriptionManager.connect();
        });
    }
    subscribe(table, callback, filter = {}) {
        this.subscriptionManager.subscribe(table, filter);
        this.subscriptionManager.on(table, callback);
        return () => {
            this.subscriptionManager.unsubscribe(table);
            this.subscriptionManager.off(table, callback);
        };
    }
    onInsert(table, callback) {
        return this.subscribe(table, callback, { event: ['INSERT'] });
    }
    onUpdate(table, callback) {
        return this.subscribe(table, callback, { event: ['UPDATE'] });
    }
    onDelete(table, callback) {
        return this.subscribe(table, callback, { event: ['DELETE'] });
    }
    // Project Management
    getProject() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.projectId) {
                throw new Error('Project ID is required');
            }
            return this.request.get(`/api/projects/${this.projectId}`);
        });
    }
    listProjects() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request.get('/api/projects');
        });
    }
    createProject(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request.post('/api/projects', { name });
        });
    }
    // Table Management
    createTable(name, schema) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.projectId) {
                throw new Error('Project ID is required');
            }
            return this.request.post(`/api/projects/${this.projectId}/tables`, {
                name,
                schema,
            });
        });
    }
    listTables() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.projectId) {
                throw new Error('Project ID is required');
            }
            return this.request.get(`/api/projects/${this.projectId}/tables`);
        });
    }
    getTable(tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.projectId) {
                throw new Error('Project ID is required');
            }
            return this.request.get(`/api/projects/${this.projectId}/tables/${tableName}`);
        });
    }
    // Query Builder
    from(tableName) {
        return new query_builder_1.QueryBuilder(this, tableName);
    }
    // Data Operations
    query(tableName_1) {
        return __awaiter(this, arguments, void 0, function* (tableName, options = {}) {
            if (!this.projectId) {
                throw new Error('Project ID is required');
            }
            return this.request.post(`/api/projects/${this.projectId}/tables/${tableName}/query`, options);
        });
    }
    insert(tableName_1, data_1) {
        return __awaiter(this, arguments, void 0, function* (tableName, data, options = {}) {
            if (!this.projectId) {
                throw new Error('Project ID is required');
            }
            return this.request.post(`/api/projects/${this.projectId}/tables/${tableName}/rows`, Object.assign({ data }, options));
        });
    }
    update(tableName_1, data_1) {
        return __awaiter(this, arguments, void 0, function* (tableName, data, options = {}) {
            if (!this.projectId) {
                throw new Error('Project ID is required');
            }
            return this.request.put(`/api/projects/${this.projectId}/tables/${tableName}/rows`, Object.assign({ data }, options));
        });
    }
    delete(tableName_1) {
        return __awaiter(this, arguments, void 0, function* (tableName, options = {}) {
            if (!this.projectId) {
                throw new Error('Project ID is required');
            }
            return this.request.delete(`/api/projects/${this.projectId}/tables/${tableName}/rows`, { data: options });
        });
    }
}
exports.LitebaseClient = LitebaseClient;
