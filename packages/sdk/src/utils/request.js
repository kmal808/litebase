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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestClient = void 0;
const axios_1 = __importDefault(require("axios"));
class RequestClient {
    constructor(config) {
        this.client = axios_1.default.create({
            baseURL: config.baseUrl || 'http://localhost:3000',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.apiKey}`,
            },
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => response.data, (error) => {
            if (error.response) {
                throw new Error(error.response.data.message || 'An error occurred');
            }
            throw error;
        });
    }
    get(path, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.client.get(path, config);
        });
    }
    post(path, data, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.client.post(path, data, config);
        });
    }
    put(path, data, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.client.put(path, data, config);
        });
    }
    delete(path, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.client.delete(path, config);
        });
    }
}
exports.RequestClient = RequestClient;
