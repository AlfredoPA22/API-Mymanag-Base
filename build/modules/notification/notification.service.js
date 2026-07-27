"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllNotificationsRead = exports.markNotificationRead = exports.countUnreadNotifications = exports.listNotifications = exports.createNotification = void 0;
const notification_model_1 = require("./notification.model");
const LIST_LIMIT = 50;
const createNotification = async (companyId, input) => {
    const notification = await notification_model_1.Notification.create({
        company: companyId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link || "",
    });
    return notification.toObject();
};
exports.createNotification = createNotification;
const listNotifications = async (companyId) => {
    return await notification_model_1.Notification.find({ company: companyId })
        .sort({ createdAt: -1 })
        .limit(LIST_LIMIT)
        .lean();
};
exports.listNotifications = listNotifications;
const countUnreadNotifications = async (companyId) => {
    return await notification_model_1.Notification.countDocuments({ company: companyId, read: false });
};
exports.countUnreadNotifications = countUnreadNotifications;
const markNotificationRead = async (companyId, notificationId) => {
    const notification = await notification_model_1.Notification.findOneAndUpdate({ _id: notificationId, company: companyId }, { $set: { read: true } }, { new: true }).lean();
    if (!notification) {
        throw new Error("Notificación no encontrada");
    }
    return notification;
};
exports.markNotificationRead = markNotificationRead;
const markAllNotificationsRead = async (companyId) => {
    await notification_model_1.Notification.updateMany({ company: companyId, read: false }, { $set: { read: true } });
    return { success: true };
};
exports.markAllNotificationsRead = markAllNotificationsRead;
