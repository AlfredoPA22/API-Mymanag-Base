"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationResolver = void 0;
const notification_service_1 = require("./notification.service");
exports.notificationResolver = {
    Query: {
        async listNotifications(_, args, context) {
            return await (0, notification_service_1.listNotifications)(context.user.companyId);
        },
        async countUnreadNotifications(_, args, context) {
            return await (0, notification_service_1.countUnreadNotifications)(context.user.companyId);
        },
    },
    Mutation: {
        async markNotificationRead(_, args, context) {
            return await (0, notification_service_1.markNotificationRead)(context.user.companyId, args.notificationId);
        },
        async markAllNotificationsRead(_, args, context) {
            return await (0, notification_service_1.markAllNotificationsRead)(context.user.companyId);
        },
    },
};
