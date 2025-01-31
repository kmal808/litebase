"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionManager = void 0;
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
class SubscriptionManager extends events_1.EventEmitter {
    constructor(baseUrl, apiKey, projectId) {
        super();
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.projectId = projectId;
        this.ws = null;
        this.subscriptions = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectTimeout = 1000; // Start with 1 second
    }
    getWebSocketUrl() {
        const wsUrl = this.baseUrl.replace(/^http/, 'ws');
        return `${wsUrl}/realtime?apiKey=${this.apiKey}&projectId=${this.projectId}`;
    }
    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new ws_1.default(this.getWebSocketUrl());
                this.ws.on('open', () => {
                    this.reconnectAttempts = 0;
                    this.reconnectTimeout = 1000;
                    this.resubscribe();
                    resolve();
                });
                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'subscription') {
                            this.emit(`${message.table}:${message.event}`, message.data);
                            this.emit(message.table, message); // Emit for all events on this table
                        }
                    }
                    catch (error) {
                        console.error('Failed to parse WebSocket message:', error);
                    }
                });
                this.ws.on('close', () => {
                    this.handleDisconnect();
                });
                this.ws.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    if (!this.ws || this.ws.readyState === ws_1.default.CLOSED) {
                        reject(error);
                    }
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    handleDisconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.reconnectTimeout *= 2; // Exponential backoff
            console.log(`Reconnecting in ${this.reconnectTimeout}ms...`);
            setTimeout(() => this.connect(), this.reconnectTimeout);
        }
        else {
            this.emit('disconnected');
            console.error('Max reconnection attempts reached');
        }
    }
    resubscribe() {
        const ws = this.ws;
        if (!ws)
            return;
        // Resubscribe to all active subscriptions
        this.subscriptions.forEach((filter, table) => {
            const message = {
                type: 'subscribe',
                table,
                filter,
            };
            ws.send(JSON.stringify(message));
        });
    }
    subscribe(table, filter = {}) {
        if (!this.ws) {
            throw new Error('WebSocket is not connected');
        }
        this.subscriptions.set(table, filter);
        const message = {
            type: 'subscribe',
            table,
            filter,
        };
        this.ws.send(JSON.stringify(message));
    }
    unsubscribe(table) {
        if (!this.ws) {
            throw new Error('WebSocket is not connected');
        }
        this.subscriptions.delete(table);
        const message = {
            type: 'unsubscribe',
            table,
        };
        this.ws.send(JSON.stringify(message));
    }
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.subscriptions.clear();
        }
    }
}
exports.SubscriptionManager = SubscriptionManager;
